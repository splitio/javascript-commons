// Dynamically require ioredis to prevent strict TypeScript binding
// and handle module export differences between v4 and v5.
let RedisConstructor: any;
try {
  const ioredisLib = require('ioredis');
  RedisConstructor = ioredisLib.default || ioredisLib;
} catch (e) {
  // If we reach here, the peer dependency is missing
  throw new Error('ioredis is missing. Please install ioredis v4 or v5.');
}

import { ILogger } from '../../logger/types';
import { merge, isString } from '../../utils/lang';
import { thenable } from '../../utils/promise/thenable';
import { timeout } from '../../utils/promise/timeout';
import { setToArray } from '../../utils/lang/sets';

const LOG_PREFIX = 'storage:redis-adapter: ';

// If we ever decide to fully wrap every method, there's a Commander.getBuiltinCommands from ioredis.
const METHODS_TO_PROMISE_WRAP = ['set', 'exec', 'del', 'get', 'keys', 'sadd', 'srem', 'sismember', 'smembers', 'incr', 'rpush', 'expire', 'mget', 'lrange', 'ltrim', 'hset', 'hincrby', 'popNRaw'];
const METHODS_TO_PROMISE_WRAP_EXEC = ['pipeline'];

// Not part of the settings since it'll vary on each storage. We should be removing storage specific logic from elsewhere.
const DEFAULT_OPTIONS = {
  connectionTimeout: 10000,
  operationTimeout: 5000
};
// Library specifics.
const DEFAULT_LIBRARY_OPTIONS = {
  enableOfflineQueue: false,
  connectTimeout: DEFAULT_OPTIONS.connectionTimeout,
  lazyConnect: false,
  // CRITICAL: v5 defaults this to 0 (disabled), which breaks dynamic clusters.
  // v4 defaulted to 5000. We explicitly set it here to ensure v5 works like v4.
  slotsRefreshInterval: 5000,
};

interface IRedisCommand {
  resolve: (value?: any) => void,
  reject: (err?: any) => void,
  command: () => Promise<any>,
  name: string,
}

/**
 * Redis adapter on top of the library of choice (written with ioredis) for some extra control.
 * Refactored to use Composition and Proxy instead of Inheritance to support both v4 and v5.
 */
export class RedisAdapter {
  // eslint-disable-next-line no-undef -- Index signature to allow proxying dynamic ioredis methods without TS errors
  [key: string]: any;
  private readonly log: ILogger;
  private _options: Record<string, any>;
  private _notReadyCommandsQueue?: IRedisCommand[];
  private _runningCommands: Set<Promise<any>>;

  // The actual ioredis instance
  public client: any;

  constructor(log: ILogger, storageSettings: Record<string, any> = {}) {
    const options = RedisAdapter._defineOptions(storageSettings);

    this.log = log;
    this._options = options;
    this._notReadyCommandsQueue = [];
    this._runningCommands = new Set();

    // Instantiate the client using the dynamic constructor
    const librarySettings = RedisAdapter._defineLibrarySettings(options);
    this.client = new RedisConstructor(...librarySettings);

    this._listenToEvents();
    this._setTimeoutWrappers();
    this._setDisconnectWrapper();

    // Return a Proxy. This allows the adapter to act exactly like an extended class.
    // If a method/property is accessed that we didn't explicitly wrap, it forwards it to `this.client`.
    return new Proxy(this, {
      get(target: RedisAdapter, prop: string | symbol) {
        // If the property exists on our wrapper (like wrapped 'get', 'set', or internal methods)
        if (prop in target) {
          return target[prop as keyof RedisAdapter];
        }
        // If it doesn't exist on our wrapper but exists on the real client (like 'on', 'quit')
        if (target.client && prop in target.client) {
          const val = target.client[prop];
          return typeof val === 'function' ? val.bind(target.client) : val;
        }
        return undefined;
      }
    });
  }

  _listenToEvents() {
    this.client.once('ready', () => {
      const commandsCount = this._notReadyCommandsQueue ? this._notReadyCommandsQueue.length : 0;
      this.log.info(LOG_PREFIX + `Redis connection established. Queued commands: ${commandsCount}.`);

      this._notReadyCommandsQueue && this._notReadyCommandsQueue.forEach(queued => {
        this.log.info(LOG_PREFIX + `Executing queued ${queued.name} command.`);
        queued.command().then(queued.resolve).catch(queued.reject);
      });
      // After the SDK is ready for the first time we'll stop queueing commands. This is just so we can keep handling BUR for them.
      this._notReadyCommandsQueue = undefined;
    });
    this.client.once('close', () => {
      this.log.info(LOG_PREFIX + 'Redis connection closed.');
    });
  }

  _setTimeoutWrappers() {
    const instance = this;

    // We pass `bindTarget` so pipeline execution is bound to the pipeline object,
    // while standard commands are bound to the client.
    const wrapCommand = (originalMethod: Function, methodName: string, bindTarget: any) => {
      return function (...params: any[]) {
        function commandWrapper() {
          instance.log.debug(`${LOG_PREFIX}Executing ${methodName}.`);
          const result = originalMethod.apply(bindTarget, params);

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
              instance.log.error(`${LOG_PREFIX}${methodName} operation threw an error or exceeded configured timeout of ${instance._options.operationTimeout}ms. Message: ${err}`);
              // Handling is not the adapter responsibility.
              throw err;
            });
          }

          return result;
        }

        if (instance._notReadyCommandsQueue) {
          return new Promise((resolve, reject) => {
            instance._notReadyCommandsQueue!.unshift({
              resolve,
              reject,
              command: commandWrapper,
              name: methodName.toUpperCase()
            });
          });
        } else {
          return commandWrapper();
        }
      };
    };

    // Wrap regular async methods to track timeouts and queue when Redis is not yet executing commands.
    METHODS_TO_PROMISE_WRAP.forEach(methodName => {
      const originalFn = this.client[methodName];
      this[methodName] = wrapCommand(originalFn, methodName, this.client);
    });

    // Special handling for pipeline~like methods. We need to wrap the async trigger, which is exec, but return the Pipeline right away.
    METHODS_TO_PROMISE_WRAP_EXEC.forEach(methodName => {
      const originalFn = this.client[methodName];
      // "First level wrapper" to handle the sync execution and wrap async, queueing later if applicable.
      this[methodName] = function (...args: any[]) {
        const res = originalFn.apply(instance.client, args);
        const originalExec = res.exec;

        res.exec = wrapCommand(originalExec, `${methodName}.exec`, res);

        return res;
      };
    });
  }

  _setDisconnectWrapper() {
    const instance = this;
    const originalMethod = this.client.disconnect;

    this.disconnect = function disconnect(...params: any[]) {
      setTimeout(function deferredDisconnect() {
        if (instance._runningCommands.size > 0) {
          instance.log.info(LOG_PREFIX + `Attempting to disconnect but there are ${instance._runningCommands.size} commands still waiting for resolution. Defering disconnection until those finish.`);

          Promise.all(setToArray(instance._runningCommands))
            .then(() => {
              instance.log.debug(LOG_PREFIX + 'Pending commands finished successfully, disconnecting.');
              originalMethod.apply(instance.client, params);
            })
            .catch(e => {
              instance.log.warn(LOG_PREFIX + `Pending commands finished with error: ${e}. Proceeding with disconnection.`);
              originalMethod.apply(instance.client, params);
            });
        } else {
          instance.log.debug(LOG_PREFIX + 'No commands pending execution, disconnect.');
          // Nothing pending, just proceed.
          originalMethod.apply(instance.client, params);
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
