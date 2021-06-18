import { ISyncManager, ISyncManagerCS, ISyncManagerFactoryParams } from './types';
import { syncTaskComposite } from './syncTaskComposite';
import { eventsSyncTaskFactory } from './submitters/eventsSyncTask';
import { impressionsSyncTaskFactory } from './submitters/impressionsSyncTask';
import { impressionCountsSyncTaskFactory } from './submitters/impressionCountsSyncTask';
import { IReadinessManager } from '../readiness/types';
import { IStorageSync } from '../storages/types';
import { IPushManagerFactoryParams, IPushManager, IPushManagerCS } from './streaming/types';
import { IPollingManager, IPollingManagerCS, IPollingManagerFactoryParams } from './polling/types';
import { PUSH_SUBSYSTEM_UP, PUSH_SUBSYSTEM_DOWN } from './streaming/constants';
import { SYNC_START_POLLING, SYNC_CONTINUE_POLLING, SYNC_STOP_POLLING } from '../logger/constants';

/**
 * Online SyncManager factory.
 * Can be used for server-side API, and client-side API with or without multiple clients.
 *
 * @param pollingManagerFactory allows to specialize the SyncManager for server-side or client-side API by passing
 * `pollingManagerSSFactory` or `pollingManagerCSFactory` respectively.
 * @param pushManagerFactory optional to build a SyncManager with or without streaming support
 */
export function syncManagerOnlineFactory(
  pollingManagerFactory: (...args: IPollingManagerFactoryParams) => IPollingManager,
  pushManagerFactory?: (...args: IPushManagerFactoryParams) => IPushManager | undefined
): (params: ISyncManagerFactoryParams) => ISyncManagerCS {

  /**
   * SyncManager factory for modular SDK
   */
  return function ({
    settings,
    platform,
    splitApi,
    storage,
    readiness
  }: ISyncManagerFactoryParams): ISyncManagerCS {

    const log = settings.log;

    /** Polling Manager */
    const pollingManager = pollingManagerFactory(splitApi, storage, readiness, settings);

    /** Push Manager */
    const pushManager = settings.streamingEnabled && pushManagerFactory ?
      pushManagerFactory(pollingManager, storage, readiness, splitApi.fetchAuth, platform, settings) :
      undefined;

    /** Submitter Manager */
    // It is not inyected via a factory as push and polling managers, because at the moment it is mandatory and the same for server-side and client-side variants
    const submitters = [
      impressionsSyncTaskFactory(log, splitApi.postTestImpressionsBulk, storage.impressions, settings.scheduler.impressionsRefreshRate, settings.core.labelsEnabled),
      eventsSyncTaskFactory(log, splitApi.postEventsBulk, storage.events, settings.scheduler.eventsPushRate, settings.startup.eventsFirstPushWindow)
      // @TODO add telemetry submitter
    ];
    if (storage.impressionCounts) submitters.push(impressionCountsSyncTaskFactory(log, splitApi.postTestImpressionsCount, storage.impressionCounts));
    const submitter = syncTaskComposite(submitters);


    /** Sync Manager logic */

    function startPolling() {
      if (!pollingManager.isRunning()) {
        log.info(SYNC_START_POLLING);
        pollingManager.start();
      } else {
        log.info(SYNC_CONTINUE_POLLING);
      }
    }

    function stopPollingAndSyncAll() {
      log.info(SYNC_STOP_POLLING);
      // if polling, stop
      if (pollingManager.isRunning()) pollingManager.stop();

      // fetch splits and segments. There is no need to catch this promise (it is always resolved)
      pollingManager.syncAll();
    }

    let running = false;

    return {
      pushManager,

      start() {
        // start syncing splits and segments
        if (pushManager) {
          pollingManager.syncAll();
          pushManager.on(PUSH_SUBSYSTEM_UP, stopPollingAndSyncAll);
          pushManager.on(PUSH_SUBSYSTEM_DOWN, startPolling);
          // Run in next event-loop cycle as in client-side SyncManager
          pushManager.start();
        } else {
          pollingManager.start();
        }

        // start periodic data recording (events, impressions, telemetry).
        submitter && submitter.start();
        running = true;
      },

      stop() {
        // stop syncing
        if (pushManager) pushManager.stop();
        if (pollingManager.isRunning()) pollingManager.stop();

        // stop periodic data recording (events, impressions, telemetry).
        if (submitter) submitter.stop();
        running = false;
      },

      isRunning() {
        return running;
      },

      flush() {
        if (submitter) return submitter.execute();
        else return Promise.resolve();
      },

      // [Only used for client-side]
      // It assumes that polling and push managers implement the interfaces for client-side
      shared(matchingKey: string, readinessManager: IReadinessManager, storage: IStorageSync): ISyncManager {

        const mySegmentsSyncTask = (pollingManager as IPollingManagerCS).add(matchingKey, readinessManager, storage);

        return {
          isRunning: mySegmentsSyncTask.isRunning,
          start() {
            if (pushManager) {
              if (pollingManager.isRunning()) {
                // if doing polling, we must start the periodic fetch of data
                if (storage.splits.usesSegments()) mySegmentsSyncTask.start();
              } else {
                // if not polling, we must execute the sync task for the initial fetch
                // of segments since `syncAll` was already executed when starting the main client
                mySegmentsSyncTask.execute();
              }
              (pushManager as IPushManagerCS).add(matchingKey, mySegmentsSyncTask);
            } else {
              if (storage.splits.usesSegments()) mySegmentsSyncTask.start();
            }
          },
          stop() {
            // check in case `client.destroy()` has been invoked more than once for the same client
            const mySegmentsSyncTask = (pollingManager as IPollingManagerCS).get(matchingKey);
            if (mySegmentsSyncTask) {
              // stop syncing
              if (pushManager) (pushManager as IPushManagerCS).remove(matchingKey);
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
