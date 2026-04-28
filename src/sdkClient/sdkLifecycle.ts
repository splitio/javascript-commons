import { releaseApiKey, validateAndTrackApiKey } from '../utils/inputValidation/apiKey';
import { ISdkFactoryContext } from '../sdkFactory/types';

const COOLDOWN_TIME_IN_MILLIS = 1000;

/**
 * Creates an Sdk client, i.e., a base client with status, init, flush and destroy interface
 */
export function sdkLifecycleFactory(params: ISdkFactoryContext, isSharedClient?: boolean): { init(): void; flush(): Promise<void>; destroy(): Promise<void> } {
  const { sdkReadinessManager, syncManager, storage, settings, telemetryTracker, impressionsTracker, platform } = params;

  let hasInit = false;
  let lastActionTime = 0;

  const signalListener = platform.SignalListener && new platform.SignalListener(params);

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

  return {
    init() {
      if (hasInit) return;
      hasInit = true;

      if (!isSharedClient) {
        validateAndTrackApiKey(settings.log, settings.core.authorizationKey);
        sdkReadinessManager.readinessManager.init();
        impressionsTracker.start();
        syncManager && syncManager.start();
        signalListener && signalListener.start();
      }
    },

    flush() {
      // @TODO define cooldown time
      return __cooldown(__flush, COOLDOWN_TIME_IN_MILLIS);
    },

    destroy() {
      hasInit = false;
      // Mark the SDK as destroyed immediately
      sdkReadinessManager.readinessManager.destroy();

      // For main client, cleanup the SDK Key, listeners and scheduled jobs, and record stat before flushing data
      if (!isSharedClient) {
        releaseApiKey(settings.core.authorizationKey);
        telemetryTracker.sessionLength();
        signalListener && signalListener.stop();
        impressionsTracker.stop();
      }

      // Stop background jobs
      syncManager && syncManager.stop();

      return __flush().then(() => {
        // Cleanup storage
        return storage.destroy();
      });
    }
  };
}
