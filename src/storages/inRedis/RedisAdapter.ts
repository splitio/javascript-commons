import ioredis from 'ioredis';
import { ILogger } from '../../logger/types';
import { merge, isString } from '../../utils/lang';
import { _Set, setToArray, ISet } from '../../utils/lang/sets';
import { thenable } from '../../utils/promise/thenable';
import { timeout } from '../../utils/promise/timeout';

const LOG_PREFIX = 'storage:redis-adapter: ';

// If we ever decide to fully wrap every method, there's a Commander.getBuiltinCommands from ioredis.
const METHODS_TO_PROMISE_WRAP = ['set', 'exec', 'del', 'get', 'keys', 'sadd', 'srem', 'sismember', 'smembers', 'incr', 'rpush', 'pipeline', 'expire', 'mget', 'lrange', 'ltrim', 'hset'];

// Not part of the settings since it'll vary on each storage. We should be removing storage specific logic from elsewhere.
const DEFAULT_OPTIONS = {
  connectionTimeout: 10000,
  operationTimeout: 5000
};
// Library specifics.
const DEFAULT_LIBRARY_OPTIONS = {
  enableOfflineQueue: false,
  connectTimeout: DEFAULT_OPTIONS.connectionTimeout,
  lazyConnect: false
};

interface IRedisCommand {
  resolve: () => void,
  reject: (err?: any) => void,
  command: () => Promise<void>,
  name: string
}

/**
 * Redis adapter on top of the library of choice (written with ioredis) for some extra control.
 */
export class RedisAdapter extends ioredis {
  private readonly log: ILogger
  private _options: object;
  private _notReadyCommandsQueue?: IRedisCommand[];
  private _runningCommands: ISet<Promise<any>>;

  constructor(log: ILogger, storageSettings: Record<string, any>) {
    const options = RedisAdapter._defineOptions(storageSettings);
    // Call the ioredis constructor
    super(...RedisAdapter._defineLibrarySettings(options));

    this.log = log;
    this._options = options;
    this._notReadyCommandsQueue = [];
    this._runningCommands = new _Set();
    this._listenToEvents();
    this._setTimeoutWrappers();
    this._setDisconnectWrapper();
  }

  _listenToEvents() {
    this.once('ready', () => {
      const commandsCount = this._notReadyCommandsQueue ? this._notReadyCommandsQueue.length : 0;
      this.log.info(LOG_PREFIX + `Redis connection established. Queued commands: ${commandsCount}.`);
      this._notReadyCommandsQueue && this._notReadyCommandsQueue.forEach(queued => {
        this.log.info(LOG_PREFIX + `Executing queued ${queued.name} command.`);
        queued.command().then(queued.resolve).catch(queued.reject);
      });
      // After the SDK is ready for the first time we'll stop queueing commands. This is just so we can keep handling BUR for them.
      this._notReadyCommandsQueue = undefined;
    });
    this.once('close', () => {
      this.log.info(LOG_PREFIX + 'Redis connection closed.');
    });
  }

  _setTimeoutWrappers() {
    const instance: Record<string, any> = this;

    METHODS_TO_PROMISE_WRAP.forEach(method => {
      const originalMethod = instance[method];

      instance[method] = function () {
        const params = arguments;

        function commandWrapper() {
          instance.log.debug(LOG_PREFIX + `Executing ${method}.`);
          // Return original method
          const result = originalMethod.apply(instance, params);

          if (thenable(result)) {
            // For handling pending commands on disconnect, add to the set and remove once finished.
            // On sync commands there's no need, only thenables.
            instance._runningCommands.add(result);
            const cleanUpRunningCommandsCb = function () {
              instance._runningCommands.delete(result);
            };
            // Both success and error remove from queue.
            result.then(cleanUpRunningCommandsCb, cleanUpRunningCommandsCb);

            return timeout(instance._options.operationTimeout, result).catch(err => {
              instance.log.error(LOG_PREFIX + `${method} operation threw an error or exceeded configured timeout of ${instance._options.operationTimeout}ms. Message: ${err}`);
              // Handling is not the adapter responsibility.
              throw err;
            });
          }

          return result;
        }

        if (instance._notReadyCommandsQueue) {
          return new Promise((res, rej) => {
            instance._notReadyCommandsQueue.unshift({
              resolve: res,
              reject: rej,
              command: commandWrapper,
              name: method.toUpperCase()
            });
          });
        } else {
          return commandWrapper();
        }
      };
    });
  }

  _setDisconnectWrapper() {
    const instance = this;
    const originalMethod = instance.disconnect;

    instance.disconnect = function disconnect(...params: []) {

      setTimeout(function deferedDisconnect() {
        if (instance._runningCommands.size > 0) {
          instance.log.info(LOG_PREFIX + `Attempting to disconnect but there are ${instance._runningCommands.size} commands still waiting for resolution. Defering disconnection until those finish.`);

          Promise.all(setToArray(instance._runningCommands))
            .then(() => {
              instance.log.debug(LOG_PREFIX + 'Pending commands finished successfully, disconnecting.');
              originalMethod.apply(instance, params);
            })
            .catch(e => {
              instance.log.warn(LOG_PREFIX + `Pending commands finished with error: ${e}. Proceeding with disconnection.`);
              originalMethod.apply(instance, params);
            });
        } else {
          instance.log.debug(LOG_PREFIX + 'No commands pending execution, disconnect.');
          // Nothing pending, just proceed.
          originalMethod.apply(instance, params);
        }
      }, 10);
    };
  }

  /**
   * Receives the options and returns an array of parameters for the ioredis constructor.
   * Keeping both redis setup options for backwards compatibility.
   */
  static _defineLibrarySettings(options: Record<string, any>) {
    const opts = merge({}, DEFAULT_LIBRARY_OPTIONS);
    const result: any[] = [opts];

    if (!isString(options.url)) {
      merge(opts, { // If it's not the string URL, merge the params separately.
        host: options.host,
        port: options.port,
        db: options.db,
        password: options.pass
      });
    } else { // If it IS the string URL, that'll be the first param for ioredis.
      result.unshift(options.url);
    }
    if (options.connectionTimeout) {
      merge(opts, { connectTimeout: options.connectionTimeout });
    }
    if (options.tls) {
      merge(opts, { tls: options.tls });
    }

    return result;
  }

  /**
   * Parses the options into what we care about.
   */
  static _defineOptions({ connectionTimeout, operationTimeout, url, host, port, db, pass, tls }: Record<string, any>) {
    const parsedOptions = {
      connectionTimeout, operationTimeout, url, host, port, db, pass, tls
    };

    return merge({}, DEFAULT_OPTIONS, parsedOptions);
  }
}
