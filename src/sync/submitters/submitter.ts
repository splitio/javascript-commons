import { syncTaskFactory } from '../syncTask';
import { ISyncTask } from '../types';
import { IRecorderCacheProducerSync } from '../../storages/types';
import { ILogger } from '../../logger/types';
import { SUBMITTERS_PUSH, SUBMITTERS_PUSH_FAILS, SUBMITTERS_PUSH_RETRY } from '../../logger/constants';
import { IResponse } from '../../services/types';

/**
 * Base function to create submitters, such as ImpressionsSubmitter and EventsSubmitter
 */
export function submitterFactory<T>(
  log: ILogger,
  postClient: (body: string) => Promise<IResponse>,
  sourceCache: IRecorderCacheProducerSync<T>,
  postRate: number,
  dataName: string,
  fromCacheToPayload?: (cacheData: T) => any,
  maxRetries: number = 0,
  debugLogs?: boolean // true for telemetry submitters
): ISyncTask<[], void> {

  let retries = 0;
  let data: any;

  function postData(): Promise<any> {
    if (data) {
      if (Array.isArray(data) && !sourceCache.isEmpty()) data = data.concat(sourceCache.pop());
    } else {
      if (sourceCache.isEmpty()) return Promise.resolve();
      // we clear the cache to track new items, while `data` is used for retries
      data = sourceCache.pop();
    }

    const dataCountMessage = typeof data.length === 'number' ? `${data.length} ${dataName}` : dataName;
    log[debugLogs ? 'debug' : 'info'](SUBMITTERS_PUSH, [dataCountMessage]);

    const jsonPayload = JSON.stringify(fromCacheToPayload ? fromCacheToPayload(data) : data);
    if (!maxRetries) data = undefined;

    return postClient(jsonPayload).then(() => {
      retries = 0;
      data = undefined;
    }).catch(err => {
      if (!maxRetries) {
        log[debugLogs ? 'debug' : 'warn'](SUBMITTERS_PUSH_FAILS, [dataCountMessage, err]);
      } else if (retries === maxRetries) {
        retries = 0;
        data = undefined;
        log[debugLogs ? 'debug' : 'warn'](SUBMITTERS_PUSH_FAILS, [dataCountMessage, err]);
      } else {
        retries++;
        log[debugLogs ? 'debug' : 'warn'](SUBMITTERS_PUSH_RETRY, [dataCountMessage, err]);
      }
    });
  }

  return syncTaskFactory(log, postData, postRate, dataName + ' submitter');
}

/**
 * Decorates a provided submitter with a first execution window
 */
export function firstPushWindowDecorator(submitter: ISyncTask, firstPushWindow: number) {
  let running = false;
  let stopEventPublisherTimeout: ReturnType<typeof setTimeout>;
  const originalStart = submitter.start;
  submitter.start = () => {
    running = true;
    stopEventPublisherTimeout = setTimeout(originalStart, firstPushWindow);
  };
  const originalStop = submitter.stop;
  submitter.stop = () => {
    running = false;
    clearTimeout(stopEventPublisherTimeout);
    originalStop();
  };
  submitter.isRunning = () => {
    return running;
  };
  return submitter;
}
