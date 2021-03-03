import objectAssign from 'object-assign';
import promiseWrapper from '../utils/promise/wrapper';
import {
  readinessManagerFactory,
  SDK_READY,
  SDK_READY_FROM_CACHE,
  SDK_UPDATE,
  SDK_READY_TIMED_OUT
} from './readinessManager';
import { ISdkReadinessManager } from './types';
import { IEventEmitter } from '../types';
import { ILogger } from '../logger/types';
// import { logFactory } from '../logger/sdkLogger';
// const log = logFactory('');

const NEW_LISTENER_EVENT = 'newListener';
const REMOVE_LISTENER_EVENT = 'removeListener';

/**
 * SdkReadinessManager factory, which provides the public status API of SDK clients and manager: ready promise, readiness event emitter and constants (SDK_READY, etc).
 * It also updates logs related warnings and errors.
 *
 * @param readyTimeout time in millis to emit SDK_READY_TIME_OUT event
 * @param internalReadyCbCount offset value of SDK_READY listeners that are added/removed internally
 * by the SDK. It is required to properly log the warning 'No listeners for SDK Readiness detected'
 * @param readinessManager optional readinessManager to use. only used internally for `shared` method
 */
export default function sdkReadinessManagerFactory(
  EventEmitter: new () => IEventEmitter,
  log: ILogger,
  readyTimeout = 0,
  internalReadyCbCount = 0,
  readinessManager = readinessManagerFactory(EventEmitter, readyTimeout)): ISdkReadinessManager {

  /** Ready callback warning */
  let readyCbCount = 0;
  readinessManager.gate.on(REMOVE_LISTENER_EVENT, (event: any) => {
    if (event === SDK_READY) readyCbCount--;
  });

  readinessManager.gate.on(NEW_LISTENER_EVENT, (event: any) => {
    if (event === SDK_READY || event === SDK_READY_TIMED_OUT) {
      if (readinessManager.isReady()) {
        log.error(`A listener was added for ${event === SDK_READY ? 'SDK_READY' : 'SDK_READY_TIMED_OUT'} on the SDK, which has already fired and won't be emitted again. The callback won't be executed.`);
      } else if (event === SDK_READY) {
        readyCbCount++;
      }
    }
  });

  /** Ready promise */
  const readyPromise = generateReadyPromise();

  readinessManager.gate.once(SDK_READY_FROM_CACHE, () => {
    log.info('Split SDK is ready from cache.');
  });

  // default onRejected handler, that just logs the error, if ready promise doesn't have one.
  function defaultOnRejected(err: any) {
    log.error(err);
  }

  function generateReadyPromise() {
    const promise = promiseWrapper(new Promise<void>((resolve, reject) => {
      readinessManager.gate.once(SDK_READY, () => {
        if (readyCbCount === internalReadyCbCount && !promise.hasOnFulfilled()) log.warn('No listeners for SDK Readiness detected. Incorrect control treatments could have been logged if you called getTreatment/s while the SDK was not yet ready.');
        resolve();
      });
      readinessManager.gate.once(SDK_READY_TIMED_OUT, reject);
    }), defaultOnRejected);

    return promise;
  }


  return {
    readinessManager,

    shared(readyTimeout = 0, internalReadyCbCount = 0) {
      return sdkReadinessManagerFactory(EventEmitter, log, readyTimeout, internalReadyCbCount, readinessManager.shared(readyTimeout));
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
        // Expose the ready promise flag
        ready: () => {
          if (readinessManager.hasTimedout()) {
            if (!readinessManager.isReady()) {
              return promiseWrapper(Promise.reject('Split SDK has emitted SDK_READY_TIMED_OUT event.'), defaultOnRejected);
            } else {
              return Promise.resolve();
            }
          }
          return readyPromise;
        },

        // Expose status for internal purposes only. Not considered part of the public API, and might be updated eventually.
        __getStatus: () => {
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
