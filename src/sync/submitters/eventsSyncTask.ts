import { IEventsCacheSync } from '../../storages/types';
import { IPostEventsBulk } from '../../services/types';
import { ISyncTask, ITimeTracker } from '../types';
import { submitterSyncTaskFactory } from './submitterSyncTask';
import { ILogger } from '../../logger/types';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-sync:submitters');

/**
 * Sync task that periodically posts tracked events
 */
export function eventsSyncTaskFactory(
  postEventsBulk: IPostEventsBulk,
  eventsCache: IEventsCacheSync,
  eventsPushRate: number,
  eventsFirstPushWindow: number,
  log: ILogger,
  latencyTracker?: ITimeTracker
): ISyncTask {

  // don't retry events.
  const syncTask = submitterSyncTaskFactory(postEventsBulk, eventsCache, eventsPushRate, 'queued events', log, latencyTracker);

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
    log.info('Flushing full events queue and reseting timer.');
    syncTask.execute();
  });

  return syncTask;
}
