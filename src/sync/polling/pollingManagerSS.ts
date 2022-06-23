import { splitsSyncTaskFactory } from './syncTasks/splitsSyncTask';
import { segmentsSyncTaskFactory } from './syncTasks/segmentsSyncTask';
import { IPollingManager, ISegmentsSyncTask, ISplitsSyncTask } from './types';
import { thenable } from '../../utils/promise/thenable';
import { POLLING_START, POLLING_STOP, LOG_PREFIX_SYNC_POLLING } from '../../logger/constants';
import { ISdkFactoryContextSync } from '../../sdkFactory/types';

/**
 * Expose start / stop mechanism for pulling data from services.
 */
export function pollingManagerSSFactory(
  params: ISdkFactoryContextSync
): IPollingManager {

  const { splitApi, storage, readiness, settings } = params;
  const log = settings.log;

  const splitsSyncTask: ISplitsSyncTask = splitsSyncTaskFactory(splitApi.fetchSplitChanges, storage, readiness, settings);
  const segmentsSyncTask: ISegmentsSyncTask = segmentsSyncTaskFactory(splitApi.fetchSegmentChanges, storage, readiness, settings);

  return {
    splitsSyncTask,
    segmentsSyncTask,

    // Start periodic fetching (polling)
    start() {
      log.info(POLLING_START);
      log.debug(LOG_PREFIX_SYNC_POLLING + `Splits will be refreshed each ${settings.scheduler.featuresRefreshRate} millis`);
      log.debug(LOG_PREFIX_SYNC_POLLING + `Segments will be refreshed each ${settings.scheduler.segmentsRefreshRate} millis`);

      const startingUp = splitsSyncTask.start();
      if (thenable(startingUp)) {
        startingUp.then(() => {
          segmentsSyncTask.start();
        });
      }
    },

    // Stop periodic fetching (polling)
    stop() {
      log.info(POLLING_STOP);

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
