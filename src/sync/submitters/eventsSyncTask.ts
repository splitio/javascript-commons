import { IEventsCacheSync } from '../../storages/types';
import { IPostEventsBulk } from '../../services/types';
import { ISyncTask, ITimeTracker } from '../types';
import { submitterSyncTaskFactory } from './submitterSyncTask';
import { ILogger } from '../../logger/types';
import { SUBMITTERS_PUSH_FULL_QUEUE, SUBMITTERS_PUSH_FULL_QUEUE_DROPPED } from '../../logger/constants';

const DATA_NAME = 'events';

/**
 * Sync task that periodically posts tracked events
 */
export function eventsSyncTaskFactory(
  log: ILogger,
  postEventsBulk: IPostEventsBulk,
  eventsCache: IEventsCacheSync,
  eventsPushRate: number,
  eventsFirstPushWindow: number,
  latencyTracker?: ITimeTracker
): ISyncTask {

  // don't retry events.
  const syncTask = submitterSyncTaskFactory(log, postEventsBulk, eventsCache, eventsPushRate, DATA_NAME, latencyTracker);

  // Set a timer for the first push of events,
  if (eventsFirstPushWindow > 0) {
    let stopEventPublisherTimeout: ReturnType<typeof setTimeout>;
    const originalStart = syncTask.start;
    syncTask.start = () => {
      stopEventPublisherTimeout = setTimeout(originalStart, eventsFirstPushWindow);
    };
    const originalStop = syncTask.stop;
    syncTask.stop = () => {
      clearTimeout(stopEventPublisherTimeout);
      originalStop();
    };
  }

  // register events submitter to be executed when events cache is full
  eventsCache.setOnFullQueueCb(() => {
    if (syncTask.isRunning()) {
      log.info(SUBMITTERS_PUSH_FULL_QUEUE, [DATA_NAME]);
      syncTask.execute();
    } else { // If submitter is stopped (e.g., user consent declined, or app state offline), we drop items
      log.warn(SUBMITTERS_PUSH_FULL_QUEUE_DROPPED);
      eventsCache.clear();
    }
  });

  return syncTask;
}
