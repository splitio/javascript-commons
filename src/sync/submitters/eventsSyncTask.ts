import { IEventsCacheSync } from '../../storages/types';
import { IPostEventsBulk } from '../../services/types';
import { ISyncTask, ITimeTracker } from '../types';
import { submitterSyncTaskFactory } from './submitterSyncTask';
import { ILogger } from '../../logger/types';
import { INFO_16 } from '../../logger/codesConstants';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-sync:submitters');

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
  const syncTask = submitterSyncTaskFactory(log, postEventsBulk, eventsCache, eventsPushRate, 'queued events', latencyTracker);

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

  // register eventsSubmitter to be executed when events cache is full
  eventsCache.setOnFullQueueCb(() => {
    log.info(INFO_16);
    syncTask.execute();
  });

  return syncTask;
}
