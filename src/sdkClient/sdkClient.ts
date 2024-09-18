import { objectAssign } from '../utils/lang/objectAssign';
import { IStatusInterface, SplitIO } from '../types';
import { areAllClientDestroyed, releaseApiKey } from '../utils/inputValidation/apiKey';
import { clientFactory } from './client';
import { clientInputValidationDecorator } from './clientInputValidation';
import { ISdkFactoryContext } from '../sdkFactory/types';

const COOLDOWN_TIME_IN_MILLIS = 1000;

/**
 * Creates an Sdk client, i.e., a base client with status and destroy interface
 */
export function sdkClientFactory(params: ISdkFactoryContext): SplitIO.IClient | SplitIO.IAsyncClient {
  const { clients, sdkReadinessManager, syncManager, mySegmentsSyncManager, storage, signalListener, settings, telemetryTracker, uniqueKeysTracker } = params;

  let destroyPromise: Promise<void> | undefined;
  let lastActionTime = 0;

  function __cooldown(func: Function, time: number) {
    const now = Date.now();
    //get the actual time elapsed in ms
    const timeElapsed = now - lastActionTime;
    //check if the time elapsed is less than desired cooldown
    if (timeElapsed < time) {
      //if yes, return message with remaining time in seconds
      settings.log.warn(`Flush cooldown, remaining time ${(time - timeElapsed) / 1000} seconds`);
      return Promise.resolve();
    } else {
      //Do the requested action and re-assign the lastActionTime
      lastActionTime = now;
      return func();
    }
  }

  function __flush() {
    return syncManager ? syncManager.flush() : Promise.resolve();
  }

  return objectAssign(
    // Proto-linkage of the readiness Event Emitter
    Object.create(sdkReadinessManager.sdkStatus) as IStatusInterface,

    // Client API (getTreatment* & track methods)
    clientInputValidationDecorator(
      settings,
      clientFactory(params),
      sdkReadinessManager.readinessManager
    ),

    // Sdk destroy
    {
      flush() {
        // @TODO define cooldown time
        return __cooldown(__flush, COOLDOWN_TIME_IN_MILLIS);
      },
      destroy() {
        if (destroyPromise) return destroyPromise;

        // Mark the client as destroyed immediately
        sdkReadinessManager.readinessManager.destroy();

        const isLastDestroyCall = areAllClientDestroyed(clients);

        // Only for client-side standalone
        mySegmentsSyncManager && mySegmentsSyncManager.stop();

        // For last client, release the SDK Key and record stat before flushing data
        if (isLastDestroyCall) {
          releaseApiKey(settings.core.authorizationKey);
          telemetryTracker.sessionLength();
          syncManager && syncManager.stop();
        }

        return destroyPromise = __flush().then(() => {
          if (isLastDestroyCall) {
            signalListener && signalListener.stop();
            uniqueKeysTracker && uniqueKeysTracker.stop();
          }

          // Cleanup storage
          return storage.destroy();
        });
      }
    }
  );
}
