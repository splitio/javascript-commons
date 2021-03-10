import splitsSyncTaskFactory from './syncTasks/splitsSyncTask';
import segmentsSyncTaskFactory from './syncTasks/segmentsSyncTask';
import { IStorageSync } from '../../storages/types';
import { IReadinessManager } from '../../readiness/types';
import { ISplitApi } from '../../services/types';
import { ISettings } from '../../types';
import { IPollingManager, ISegmentsSyncTask, ISplitsSyncTask } from './types';
import thenable from '../../utils/promise/thenable';
import { INFO_8, INFO_9 } from '../../logger/codesConstants';
import { DEBUG_37, DEBUG_38 } from '../../logger/codesConstantsNode';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-sync:polling-manager');

/**
 * Expose start / stop mechanism for pulling data from services.
 */
export default function pollingManagerSSFactory(
  splitApi: ISplitApi,
  storage: IStorageSync,
  readiness: IReadinessManager,
  settings: ISettings
): IPollingManager {

  const log = settings.log;

  const splitsSyncTask: ISplitsSyncTask = splitsSyncTaskFactory(splitApi.fetchSplitChanges, storage, readiness, settings);
  const segmentsSyncTask: ISegmentsSyncTask = segmentsSyncTaskFactory(splitApi.fetchSegmentChanges, storage, readiness, settings);

  return {
    splitsSyncTask,
    segmentsSyncTask,

    // Start periodic fetching (polling)
    start() {
      log.info(INFO_8);
      log.debug(DEBUG_37, [settings.scheduler.featuresRefreshRate]); // @TODO remove since we already log it in syncTask debug log?
      log.debug(DEBUG_38, [settings.scheduler.segmentsRefreshRate]); // @TODO remove since we already log it in syncTask debug log?

      const startingUp = splitsSyncTask.start();
      if (thenable(startingUp)) {
        startingUp.then(() => {
          segmentsSyncTask.start();
        });
      }
    },

    // Stop periodic fetching (polling)
    stop() {
      log.info(INFO_9);

      if (splitsSyncTask.isRunning()) splitsSyncTask.stop();
      if (segmentsSyncTask.isRunning()) segmentsSyncTask.stop();
    },

    // Used by SyncManager to know if running in polling mode.
    isRunning: splitsSyncTask.isRunning,

    syncAll() {
      // fetch splits and segments. There is no need to catch this promise (`SplitChangesUpdater` is always resolved with a boolean value)
      return splitsSyncTask.execute().then(() => {
        return segmentsSyncTask.execute();
      });
    }
  };
}
