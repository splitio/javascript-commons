import { objectAssign } from '../utils/lang/objectAssign';
import { promiseWrapper } from '../utils/promise/wrapper';
import { readinessManagerFactory } from './readinessManager';
import { ISdkReadinessManager } from './types';
import { ISettings } from '../types';
import SplitIO from '../../types/splitio';
import { SDK_READY, SDK_READY_TIMED_OUT, SDK_READY_FROM_CACHE, SDK_UPDATE } from './constants';
import { ERROR_CLIENT_LISTENER, CLIENT_READY_FROM_CACHE, CLIENT_READY, CLIENT_NO_LISTENER } from '../logger/constants';

const NEW_LISTENER_EVENT = 'newListener';
const REMOVE_LISTENER_EVENT = 'removeListener';
const TIMEOUT_ERROR = new Error(SDK_READY_TIMED_OUT);

/**
 * SdkReadinessManager factory, which provides the public status API of SDK clients and manager: ready promise, readiness event emitter and constants (SDK_READY, etc).
 * It also updates logs related warnings and errors.
 *
 * @param readyTimeout - time in millis to emit SDK_READY_TIME_OUT event
 * @param readinessManager - optional readinessManager to use. only used internally for `shared` method
 */
export function sdkReadinessManagerFactory(
  EventEmitter: new () => SplitIO.IEventEmitter,
  settings: ISettings,
  readinessManager = readinessManagerFactory(EventEmitter, settings)): ISdkReadinessManager {

  const log = settings.log;

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
    } else if (event === SDK_READY_FROM_CACHE && readinessManager.isReadyFromCache()) {
      log.error(ERROR_CLIENT_LISTENER, ['SDK_READY_FROM_CACHE']);
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

    shared() {
      return sdkReadinessManagerFactory(EventEmitter, settings, readinessManager.shared());
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

        // @TODO: remove in next major
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

        whenReady() {
          return new Promise<void>((resolve, reject) => {
            if (readinessManager.isReady()) {
              resolve();
            } else if (readinessManager.hasTimedout()) {
              reject(TIMEOUT_ERROR);
            } else {
              readinessManager.gate.once(SDK_READY, resolve);
              readinessManager.gate.once(SDK_READY_TIMED_OUT, () => reject(TIMEOUT_ERROR));
            }
          });
        },

        whenReadyFromCache() {
          return new Promise<boolean>((resolve, reject) => {
            if (readinessManager.isReadyFromCache()) {
              resolve(readinessManager.isReady());
            } else if (readinessManager.hasTimedout()) {
              reject(TIMEOUT_ERROR);
            } else {
              readinessManager.gate.once(SDK_READY_FROM_CACHE, () => resolve(readinessManager.isReady()));
              readinessManager.gate.once(SDK_READY_TIMED_OUT, () => reject(TIMEOUT_ERROR));
            }
          });
        },

        __getStatus() {
          return {
            isReady: readinessManager.isReady(),
            isReadyFromCache: readinessManager.isReadyFromCache(),
            isTimedout: readinessManager.isTimedout(),
            hasTimedout: readinessManager.hasTimedout(),
            isDestroyed: readinessManager.isDestroyed(),
            isOperational: readinessManager.isOperational(),
            lastUpdate: readinessManager.lastUpdate(),
          };
        },
      }
    )
  };
}
