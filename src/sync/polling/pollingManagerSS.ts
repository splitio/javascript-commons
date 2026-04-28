import { definitionsSyncTaskFactory } from './syncTasks/definitionsSyncTask';
import { segmentsSyncTaskFactory } from './syncTasks/segmentsSyncTask';
import { IPollingManager, ISegmentsSyncTask, IDefinitionsSyncTask } from './types';
import { POLLING_START, POLLING_STOP, LOG_PREFIX_SYNC_POLLING } from '../../logger/constants';
import { ISdkFactoryContextSync } from '../../sdkFactory/types';
import { IDefinitionChangesFetcher } from './fetchers/types';

/**
 * Expose start / stop mechanism for pulling data from services.
 */
export function pollingManagerSSFactory(
  params: ISdkFactoryContextSync,
  definitionChangesFetcher: IDefinitionChangesFetcher
): IPollingManager {

  const { splitApi, storage, readiness, settings } = params;
  const log = settings.log;

  const definitionsSyncTask: IDefinitionsSyncTask = definitionsSyncTaskFactory(definitionChangesFetcher, storage, readiness, settings);
  const segmentsSyncTask: ISegmentsSyncTask = segmentsSyncTaskFactory(splitApi.fetchSegmentChanges, storage, readiness, settings);

  return {
    definitionsSyncTask,
    segmentsSyncTask,

    // Start periodic fetching (polling)
    start() {
      log.info(POLLING_START);
      log.debug(LOG_PREFIX_SYNC_POLLING + `${definitionChangesFetcher.type} will be refreshed each ${settings.scheduler.featuresRefreshRate} millis`);
      log.debug(LOG_PREFIX_SYNC_POLLING + `segments will be refreshed each ${settings.scheduler.segmentsRefreshRate} millis`);

      const startingUp = definitionsSyncTask.start();
      if (startingUp) {
        startingUp.then(() => {
          if (definitionsSyncTask.isRunning()) segmentsSyncTask.start();
        });
      }
    },

    // Stop periodic fetching (polling)
    stop() {
      log.info(POLLING_STOP);

      if (definitionsSyncTask.isRunning()) definitionsSyncTask.stop();
      if (segmentsSyncTask.isRunning()) segmentsSyncTask.stop();
    },

    // Used by SyncManager to know if running in polling mode.
    isRunning: definitionsSyncTask.isRunning,

    syncAll() {
      // fetch definitions and segments. There is no need to catch this promise (`DefinitionChangesUpdater` is always resolved with a boolean value)
      return definitionsSyncTask.execute().then(() => {
        return segmentsSyncTask.execute();
      });
    }
  };
}
