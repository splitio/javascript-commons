import { IMySegmentsSyncTask, IPollingManagerCS } from './types';
import { forOwn } from '../../utils/lang';
import { IReadinessManager } from '../../readiness/types';
import { IStorageSync } from '../../storages/types';
import { mySegmentsSyncTaskFactory } from './syncTasks/mySegmentsSyncTask';
import { splitsSyncTaskFactory } from './syncTasks/splitsSyncTask';
import { getMatching } from '../../utils/key';
import { SDK_SPLITS_ARRIVED, SDK_SEGMENTS_ARRIVED } from '../../readiness/constants';
import { POLLING_SMART_PAUSING, POLLING_START, POLLING_STOP } from '../../logger/constants';
import { ISdkFactoryContextSync } from '../../sdkFactory/types';

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

  // Map of matching keys to their corresponding MySegmentsSyncTask.
  const mySegmentsSyncTasks: Record<string, IMySegmentsSyncTask> = {};

  const matchingKey = getMatching(settings.core.key);
  const mySegmentsSyncTask = add(matchingKey, readiness, storage);

  function startMySegmentsSyncTasks() {
    forOwn(mySegmentsSyncTasks, function (mySegmentsSyncTask) {
      mySegmentsSyncTask.start();
    });
  }

  function stopMySegmentsSyncTasks() {
    forOwn(mySegmentsSyncTasks, function (mySegmentsSyncTask) {
      if (mySegmentsSyncTask.isRunning()) mySegmentsSyncTask.stop();
    });
  }

  // smart pausing
  readiness.splits.on(SDK_SPLITS_ARRIVED, () => {
    if (!splitsSyncTask.isRunning()) return; // noop if not doing polling
    const splitsHaveSegments = storage.splits.usesSegments();
    if (splitsHaveSegments !== mySegmentsSyncTask.isRunning()) {
      log.info(POLLING_SMART_PAUSING, [splitsHaveSegments ? 'ON' : 'OFF']);
      if (splitsHaveSegments) {
        startMySegmentsSyncTasks();
      } else {
        stopMySegmentsSyncTasks();
      }
    }
  });

  function add(matchingKey: string, readiness: IReadinessManager, storage: IStorageSync) {
    const mySegmentsSyncTask = mySegmentsSyncTaskFactory(splitApi.fetchMySegments, storage, readiness, settings, matchingKey);

    // smart ready
    function smartReady() {
      if (!readiness.isReady() && !storage.splits.usesSegments()) readiness.segments.emit(SDK_SEGMENTS_ARRIVED);
    }
    if (!storage.splits.usesSegments()) setTimeout(smartReady, 0);
    else readiness.splits.once(SDK_SPLITS_ARRIVED, smartReady);

    mySegmentsSyncTasks[matchingKey] = mySegmentsSyncTask;
    return mySegmentsSyncTask;
  }

  return {
    splitsSyncTask,
    segmentsSyncTask: mySegmentsSyncTask,

    // Start periodic fetching (polling)
    start() {
      log.info(POLLING_START);

      splitsSyncTask.start();
      if (storage.splits.usesSegments()) startMySegmentsSyncTasks();
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
      forOwn(mySegmentsSyncTasks, function (mySegmentsSyncTask) {
        promises.push(mySegmentsSyncTask.execute());
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
