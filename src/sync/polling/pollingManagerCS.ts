import { IMySegmentsSyncTask, IPollingManagerCS } from './types';
import { forOwn } from '../../utils/lang';
import { IReadinessManager } from '../../readiness/types';
import { IStorageSync } from '../../storages/types';
import { mySegmentsSyncTaskFactory } from './syncTasks/mySegmentsSyncTask';
import { splitsSyncTaskFactory } from './syncTasks/splitsSyncTask';
import { getMatching } from '../../utils/key';
import { SDK_SPLITS_ARRIVED, SDK_SEGMENTS_ARRIVED } from '../../readiness/constants';
import { POLLING_START, POLLING_STOP } from '../../logger/constants';
import { ISdkFactoryContextSync } from '../../sdkFactory/types';
import { IN_LARGE_SEGMENT, IN_SEGMENT } from '../../utils/constants';

/**
 * Expose start / stop mechanism for polling data from services.
 * For client-side API with multiple clients.
 */
export function pollingManagerCSFactory(
  params: ISdkFactoryContextSync
): IPollingManagerCS {

  const { splitApi, storage, readiness, settings } = params;
  const log = settings.log;

  const splitsSyncTask = splitsSyncTaskFactory(splitApi.fetchSplitChanges, storage, readiness, settings, true);

  // Map of matching keys to their corresponding MySegmentsSyncTask for segments and large segments.
  const mySegmentsSyncTasks: Record<string, { msSyncTask: IMySegmentsSyncTask, mlsSyncTask?: IMySegmentsSyncTask }> = {};

  const matchingKey = getMatching(settings.core.key);
  const { msSyncTask, mlsSyncTask } = add(matchingKey, readiness, storage);

  function startMySegmentsSyncTasks() {
    const splitsHaveSegments = storage.splits.usesMatcher(IN_SEGMENT);
    const splitsHaveLargeSegments = storage.splits.usesMatcher(IN_LARGE_SEGMENT);

    forOwn(mySegmentsSyncTasks, ({ msSyncTask, mlsSyncTask }) => {
      if (splitsHaveSegments) msSyncTask.start();
      else msSyncTask.stop(); // smart pausing

      if (mlsSyncTask) {
        if (splitsHaveLargeSegments) mlsSyncTask.start();
        else mlsSyncTask.stop(); // smart pausing
      }
    });
  }

  function stopMySegmentsSyncTasks() {
    forOwn(mySegmentsSyncTasks, ({ msSyncTask, mlsSyncTask }) => {
      msSyncTask.stop();
      mlsSyncTask && mlsSyncTask.stop();
    });
  }

  readiness.splits.on(SDK_SPLITS_ARRIVED, () => {
    if (splitsSyncTask.isRunning()) startMySegmentsSyncTasks();
  });

  function add(matchingKey: string, readiness: IReadinessManager, storage: IStorageSync) {
    const msSyncTask = mySegmentsSyncTaskFactory(
      splitApi.fetchMySegments,
      () => storage.splits.usesMatcher(IN_SEGMENT),
      storage.segments,
      readiness.segments,
      settings,
      matchingKey,
      settings.scheduler.segmentsRefreshRate,
      'mySegmentsUpdater'
    );

    let mlsSyncTask;
    if (settings.sync.largeSegmentsEnabled) {
      mlsSyncTask = mySegmentsSyncTaskFactory(
        splitApi.fetchMyLargeSegments,
        () => storage.splits.usesMatcher(IN_LARGE_SEGMENT),
        storage.largeSegments!,
        readiness.largeSegments!,
        settings,
        matchingKey,
        settings.scheduler.largeSegmentsRefreshRate,
        'myLargeSegmentsUpdater'
      );
    }

    // smart ready
    function smartReady() {
      if (!readiness.isReady()) {
        if (readiness.largeSegments && !storage.splits.usesMatcher(IN_LARGE_SEGMENT)) readiness.largeSegments.emit(SDK_SEGMENTS_ARRIVED);
        if (!storage.splits.usesMatcher(IN_SEGMENT)) readiness.segments.emit(SDK_SEGMENTS_ARRIVED);
      }
    }

    if (storage.splits.usesMatcher(IN_SEGMENT) && storage.splits.usesMatcher(IN_LARGE_SEGMENT)) readiness.splits.once(SDK_SPLITS_ARRIVED, smartReady);
    else setTimeout(smartReady, 0);

    mySegmentsSyncTasks[matchingKey] = { msSyncTask: msSyncTask, mlsSyncTask: mlsSyncTask };

    return {
      msSyncTask,
      mlsSyncTask
    };
  }

  return {
    splitsSyncTask,
    segmentsSyncTask: msSyncTask,
    largeSegmentsSyncTask: mlsSyncTask,

    // Start periodic fetching (polling)
    start() {
      log.info(POLLING_START);

      splitsSyncTask.start();
      startMySegmentsSyncTasks();
    },

    // Stop periodic fetching (polling)
    stop() {
      log.info(POLLING_STOP);

      if (splitsSyncTask.isRunning()) splitsSyncTask.stop();
      stopMySegmentsSyncTasks();
    },

    // Used by SyncManager to know if running in polling mode.
    isRunning: splitsSyncTask.isRunning,

    // fetch splits and segments
    syncAll() {
      const promises = [splitsSyncTask.execute()];
      forOwn(mySegmentsSyncTasks, function ({ msSyncTask, mlsSyncTask }) {
        promises.push(msSyncTask.execute());
        mlsSyncTask && promises.push(mlsSyncTask.execute());
      });
      return Promise.all(promises);
    },

    // Support for handling mySegments sync of multiple clients
    add,

    remove(matchingKey: string) {
      delete mySegmentsSyncTasks[matchingKey];
    },

    get(matchingKey: string) {
      return mySegmentsSyncTasks[matchingKey];
    }
  };

}
