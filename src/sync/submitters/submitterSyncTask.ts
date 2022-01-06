import { syncTaskFactory } from '../syncTask';
import { ISyncTask, ITimeTracker } from '../types';
import { IRecorderCacheProducerSync } from '../../storages/types';
import { ILogger } from '../../logger/types';
import { SUBMITTERS_PUSH, SUBMITTERS_PUSH_FAILS, SUBMITTERS_PUSH_RETRY } from '../../logger/constants';
import { IResponse } from '../../services/types';

/**
 * Base function to create submitter sync tasks, such as ImpressionsSyncTask and EventsSyncTask
 */
export function submitterSyncTaskFactory<TState extends { length?: number }>(
  log: ILogger,
  postClient: (body: string) => Promise<IResponse>,
  sourceCache: IRecorderCacheProducerSync<TState>,
  postRate: number,
  dataName: string,
  latencyTracker?: ITimeTracker,
  fromCacheToPayload?: (cacheData: TState) => any,
  maxRetries: number = 0,
  debugLogs?: boolean
): ISyncTask<[], void> {

  let retries = 0;

  function postData(): Promise<any> {
    if (sourceCache.isEmpty()) return Promise.resolve();

    const data = sourceCache.state();

    const dataCount: number | '' = typeof data.length === 'number' ? data.length : '';
    log[debugLogs ? 'debug' : 'info'](SUBMITTERS_PUSH, [dataCount, dataName]);
    const latencyTrackerStop = latencyTracker && latencyTracker.start();

    const jsonPayload = JSON.stringify(fromCacheToPayload ? fromCacheToPayload(data) : data);
    if (!maxRetries) sourceCache.clear();

    const postPromise = postClient(jsonPayload).then(() => {
      retries = 0;
      sourceCache.clear(); // we clear the queue if request successes.
    }).catch(err => {
      if (!maxRetries) {
        log.warn(SUBMITTERS_PUSH_FAILS, [dataCount, dataName, err]);
      } else if (retries === maxRetries) {
        retries = 0;
        sourceCache.clear(); // we clear the queue if request fails after retries.
        log.warn(SUBMITTERS_PUSH_FAILS, [dataCount, dataName, err]);
      } else {
        retries++;
        log.warn(SUBMITTERS_PUSH_RETRY, [dataCount, dataName, err]);
      }
    });

    // if latencyTracker provided, attach stop callback to postEventsPromise
    return latencyTrackerStop ? postPromise.then(latencyTrackerStop).catch(latencyTrackerStop) : postPromise;
  }

  return syncTaskFactory(log, postData, postRate, dataName + ' submitter');
}
