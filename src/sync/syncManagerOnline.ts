import { ISyncManagerCS } from './types';
import { submitterManagerFactory } from './submitters/submitterManager';
import { IReadinessManager } from '../readiness/types';
import { IStorageSync } from '../storages/types';
import { IPushManager } from './streaming/types';
import { IPollingManager, IPollingManagerCS } from './polling/types';
import { PUSH_SUBSYSTEM_UP, PUSH_SUBSYSTEM_DOWN } from './streaming/constants';
import { SYNC_START_POLLING, SYNC_CONTINUE_POLLING, SYNC_STOP_POLLING } from '../logger/constants';
import { isConsentGranted } from '../consent';
import { POLLING, STREAMING, SYNC_MODE_UPDATE } from '../utils/constants';
import { ISdkFactoryContextSync } from '../sdkFactory/types';

/**
 * Online SyncManager factory.
 * Can be used for server-side API, and client-side API with or without multiple clients.
 *
 * @param pollingManagerFactory allows to specialize the SyncManager for server-side or client-side API by passing
 * `pollingManagerSSFactory` or `pollingManagerCSFactory` respectively.
 * @param pushManagerFactory optional to build a SyncManager with or without streaming support
 */
export function syncManagerOnlineFactory(
  pollingManagerFactory?: (params: ISdkFactoryContextSync) => IPollingManager,
  pushManagerFactory?: (params: ISdkFactoryContextSync, pollingManager: IPollingManager) => IPushManager | undefined,
): (params: ISdkFactoryContextSync) => ISyncManagerCS {

  /**
   * SyncManager factory for modular SDK
   */
  return function (params: ISdkFactoryContextSync): ISyncManagerCS {

    const { settings, settings: { log, streamingEnabled, sync: { enabled: syncEnabled } },  telemetryTracker } = params;

    /** Polling Manager */
    const pollingManager = pollingManagerFactory && pollingManagerFactory(params);

    /** Push Manager */
    const pushManager = syncEnabled && streamingEnabled && pollingManager && pushManagerFactory ?
      pushManagerFactory(params, pollingManager) :
      undefined;

    /** Submitter Manager */
    // It is not inyected as push and polling managers, because at the moment it is required
    const submitterManager = submitterManagerFactory(params);

    /** Sync Manager logic */

    function startPolling() {
      if (pollingManager!.isRunning()) {
        log.info(SYNC_CONTINUE_POLLING);
      } else {
        log.info(SYNC_START_POLLING);
        pollingManager!.start();
        telemetryTracker.streamingEvent(SYNC_MODE_UPDATE, POLLING);
      }
    }

    function stopPollingAndSyncAll() {
      log.info(SYNC_STOP_POLLING);
      // if polling, stop
      if (pollingManager!.isRunning()) {
        pollingManager!.stop();
        telemetryTracker.streamingEvent(SYNC_MODE_UPDATE, STREAMING);
      }

      // fetch splits and segments. There is no need to catch this promise (it is always resolved)
      pollingManager!.syncAll();
    }

    if (pushManager) {
      pushManager.on(PUSH_SUBSYSTEM_UP, stopPollingAndSyncAll);
      pushManager.on(PUSH_SUBSYSTEM_DOWN, startPolling);
    }

    let running = false; // flag that indicates whether the syncManager has been started (true) or stopped (false)
    let startFirstTime = true; // flag to distinguish calling the `start` method for the first time, to support pausing and resuming the synchronization

    return {
      // Exposed for fine-grained control of synchronization.
      // E.g.: user consent, app state changes (Page hide, Foreground/Background, Online/Offline).
      pollingManager,
      pushManager,
      submitterManager,

      /**
       * Method used to start the syncManager for the first time, or resume it after being stopped.
       */
      start() {
        running = true;

        // start syncing splits and segments
        if (pollingManager) {

          // If synchronization is disabled pushManager and pollingManager should not start
          if (syncEnabled) {
            if (pushManager) {
              // Doesn't call `syncAll` when the syncManager is resuming
              if (startFirstTime) {
                pollingManager.syncAll();
                startFirstTime = false;
              }
              pushManager.start();
            } else {
              pollingManager.start();
            }
          } else {
            if (startFirstTime) {
              pollingManager.syncAll();
              startFirstTime = false;
            }
          }
        }

        // start periodic data recording (events, impressions, telemetry).
        submitterManager.start(!isConsentGranted(settings));
      },

      /**
       * Method used to stop/pause the syncManager.
       */
      stop() {
        running = false;

        // stop syncing
        if (pushManager) pushManager.stop();
        if (pollingManager && pollingManager.isRunning()) pollingManager.stop();

        // stop periodic data recording (events, impressions, telemetry).
        submitterManager.stop();
      },

      isRunning() {
        return running;
      },

      flush() {
        return submitterManager.execute(!isConsentGranted(settings));
      },

      // [Only used for client-side]
      // If polling and push managers are defined (standalone mode), they implement the interfaces for client-side
      shared(matchingKey: string, readinessManager: IReadinessManager, storage: IStorageSync) {
        if (!pollingManager) return;

        const mySegmentsSyncTask = (pollingManager as IPollingManagerCS).add(matchingKey, readinessManager, storage);

        return {
          isRunning: mySegmentsSyncTask.isRunning,
          start() {
            if (syncEnabled) {
              if (pushManager) {
                if (pollingManager!.isRunning()) {
                  // if doing polling, we must start the periodic fetch of data
                  if (storage.splits.usesSegments()) mySegmentsSyncTask.start();
                } else {
                  // if not polling, we must execute the sync task for the initial fetch
                  // of segments since `syncAll` was already executed when starting the main client
                  mySegmentsSyncTask.execute();
                }
                pushManager.add(matchingKey, mySegmentsSyncTask);
              } else {
                if (storage.splits.usesSegments()) mySegmentsSyncTask.start();
              }
            } else {
              if (!readinessManager.isReady()) mySegmentsSyncTask.execute();
            }
          },
          stop() {
            // check in case `client.destroy()` has been invoked more than once for the same client
            const mySegmentsSyncTask = (pollingManager as IPollingManagerCS).get(matchingKey);
            if (mySegmentsSyncTask) {
              // stop syncing
              if (pushManager) pushManager.remove(matchingKey);
              if (mySegmentsSyncTask.isRunning()) mySegmentsSyncTask.stop();

              (pollingManager as IPollingManagerCS).remove(matchingKey);
            }
          },
          flush() { return Promise.resolve(); }
        };
      }
    };
  };
}
