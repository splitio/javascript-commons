import syncTaskFactory from '../syncTask';
import { ISyncTask, ITimeTracker } from '../types';
import { IRecorderCacheConsumerSync } from '../../storages/types';
import { ILogger } from '../../logger/types';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-sync:submitters');

/**
 * Base function to create submitter sync tasks, such as ImpressionsSyncTask and EventsSyncTask
 */
export function submitterSyncTaskFactory<TState extends { length?: number }>(
  postClient: (body: string) => Promise<Response>,
  sourceCache: IRecorderCacheConsumerSync<TState>,
  postRate: number,
  dataName: string,
  log: ILogger,
  latencyTracker?: ITimeTracker,
  fromCacheToPayload?: (cacheData: TState) => any,
  maxRetries: number = 0,
): ISyncTask {

  let retries = 0;

  function postData(): Promise<any> {
    if (sourceCache.isEmpty()) return Promise.resolve();

    const data = sourceCache.state();

    const dataCount: number | '' = typeof data.length === 'number' ? data.length : '';
    log.info(`Pushing ${dataCount} ${dataName}.`);
    const latencyTrackerStop = latencyTracker && latencyTracker.start();

    const jsonPayload = JSON.stringify(fromCacheToPayload ? fromCacheToPayload(data) : data);
    if (!maxRetries) sourceCache.clear();

    const postPromise = postClient(jsonPayload).then(() => {
      retries = 0;
      sourceCache.clear(); // we clear the queue if request successes.
    }).catch(err => {
      if (!maxRetries) {
        log.warn(`Droping ${dataCount} ${dataName} after retry. Reason ${err}.`);
      } else if (retries === maxRetries) {
        retries = 0;
        sourceCache.clear(); // we clear the queue if request fails after retries.
        log.warn(`Droping ${dataCount} ${dataName} after retry. Reason ${err}.`);
      } else {
        retries++;
        log.warn(`Failed to push ${dataCount} ${dataName}, keeping data to retry on next iteration. Reason ${err}.`);
      }
    });

    // if latencyTracker provided, attach stop callback to postEventsPromise
    return latencyTrackerStop ? postPromise.then(latencyTrackerStop).catch(latencyTrackerStop) : postPromise;
  }

  return syncTaskFactory(postData, postRate, dataName + ' submitter', log);
}
