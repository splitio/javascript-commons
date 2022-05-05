import { objectAssign } from '../utils/lang/objectAssign';
import { promiseWrapper } from '../utils/promise/wrapper';
import { readinessManagerFactory } from './readinessManager';
import { ISdkReadinessManager } from './types';
import { IEventEmitter } from '../types';
import { SDK_READY, SDK_READY_TIMED_OUT, SDK_READY_FROM_CACHE, SDK_UPDATE } from './constants';
import { ILogger } from '../logger/types';
import { ERROR_CLIENT_LISTENER, CLIENT_READY_FROM_CACHE, CLIENT_READY, CLIENT_NO_LISTENER } from '../logger/constants';

const NEW_LISTENER_EVENT = 'newListener';
const REMOVE_LISTENER_EVENT = 'removeListener';

/**
 * SdkReadinessManager factory, which provides the public status API of SDK clients and manager: ready promise, readiness event emitter and constants (SDK_READY, etc).
 * It also updates logs related warnings and errors.
 *
 * @param readyTimeout time in millis to emit SDK_READY_TIME_OUT event
 * @param readinessManager optional readinessManager to use. only used internally for `shared` method
 */
export function sdkReadinessManagerFactory(
  log: ILogger,
  EventEmitter: new () => IEventEmitter,
  readyTimeout = 0,
  readinessManager = readinessManagerFactory(EventEmitter, readyTimeout)): ISdkReadinessManager {

  /** Ready callback warning */
  let internalReadyCbCount = 0;
  let readyCbCount = 0;
  readinessManager.gate.on(REMOVE_LISTENER_EVENT, (event: any) => {
    if (event === SDK_READY) readyCbCount--;
  });

  readinessManager.gate.on(NEW_LISTENER_EVENT, (event: any) => {
    if (event === SDK_READY || event === SDK_READY_TIMED_OUT) {
      if (readinessManager.isReady()) {
        log.error(ERROR_CLIENT_LISTENER, [event === SDK_READY ? 'SDK_READY' : 'SDK_READY_TIMED_OUT']);
      } else if (event === SDK_READY) {
        readyCbCount++;
      }
    }
  });

  /** Ready promise */
  const readyPromise = generateReadyPromise();

  readinessManager.gate.once(SDK_READY_FROM_CACHE, () => {
    log.info(CLIENT_READY_FROM_CACHE);
  });

  // default onRejected handler, that just logs the error, if ready promise doesn't have one.
  function defaultOnRejected(err: any) {
    log.error(err && err.message);
  }

  function generateReadyPromise() {
    const promise = promiseWrapper(new Promise<void>((resolve, reject) => {
      readinessManager.gate.once(SDK_READY, () => {
        log.info(CLIENT_READY);

        if (readyCbCount === internalReadyCbCount && !promise.hasOnFulfilled()) log.warn(CLIENT_NO_LISTENER);
        resolve();
      });
      readinessManager.gate.once(SDK_READY_TIMED_OUT, (message: string) => {
        reject(new Error(message));
      });
    }), defaultOnRejected);

    return promise;
  }


  return {
    readinessManager,

    shared(readyTimeout = 0) {
      return sdkReadinessManagerFactory(log, EventEmitter, readyTimeout, readinessManager.shared(readyTimeout));
    },

    incInternalReadyCbCount() {
      internalReadyCbCount++;
    },

    sdkStatus: objectAssign(
      // Expose Event Emitter functionality
      Object.create(readinessManager.gate),
      {
        // Expose the event constants without changing the interface
        Event: {
          SDK_READY,
          SDK_READY_FROM_CACHE,
          SDK_UPDATE,
          SDK_READY_TIMED_OUT,
        },
        /**
         * Returns a promise that will be resolved once the SDK has finished loading (SDK_READY event emitted) or rejected if the SDK has timedout (SDK_READY_TIMED_OUT event emitted).
         * As it's meant to provide similar flexibility to the event approach, given that the SDK might be eventually ready after a timeout event, calling the `ready` method after the
         * SDK had timed out will return a new promise that should eventually resolve if the SDK gets ready.
         *
         * Caveats: the method was designed to avoid an unhandled Promise rejection if the rejection case is not handled, so that `onRejected` handler is optional when using promises.
         * However, when using async/await syntax, the rejection should be explicitly propagated like in the following example:
         * ```
         * try {
         *   await client.ready().catch((e) => { throw e; });
         *   // SDK is ready
         * } catch(e) {
         *   // SDK has timedout
         * }
         * ```
         *
         * @function ready
         * @returns {Promise<void>}
         */
        ready() {
          if (readinessManager.hasTimedout()) {
            if (!readinessManager.isReady()) {
              return promiseWrapper(Promise.reject(new Error('Split SDK has emitted SDK_READY_TIMED_OUT event.')), defaultOnRejected);
            } else {
              return Promise.resolve();
            }
          }
          return readyPromise;
        },

        // Expose status for internal purposes only. Not considered part of the public API, and might be updated eventually.
        __getStatus() {
          return {
            isReady: readinessManager.isReady(),
            isReadyFromCache: readinessManager.isReadyFromCache(),
            isOperational: readinessManager.isOperational(),
            hasTimedout: readinessManager.hasTimedout(),
            isDestroyed: readinessManager.isDestroyed(),
          };
        },
      }
    )
  };
}
