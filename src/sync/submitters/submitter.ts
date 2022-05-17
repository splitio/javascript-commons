import { syncTaskFactory } from '../syncTask';
import { ISyncTask } from '../types';
import { IRecorderCacheProducerSync } from '../../storages/types';
import { ILogger } from '../../logger/types';
import { SUBMITTERS_PUSH, SUBMITTERS_PUSH_FAILS, SUBMITTERS_PUSH_RETRY } from '../../logger/constants';
import { IResponse } from '../../services/types';

/**
 * Base function to create submitters, such as ImpressionsSubmitter and EventsSubmitter
 */
export function submitterFactory<TState>(
  log: ILogger,
  postClient: (body: string) => Promise<IResponse>,
  sourceCache: IRecorderCacheProducerSync<TState>,
  postRate: number,
  dataName: string,
  fromCacheToPayload?: (cacheData: TState) => any,
  maxRetries: number = 0,
  debugLogs?: boolean // true for telemetry submitters
): ISyncTask<[], void> {

  let retries = 0;

  function postData(): Promise<any> {
    if (sourceCache.isEmpty()) return Promise.resolve();

    const data = sourceCache.state();
    // @ts-ignore
    const dataCountMessage = typeof data.length === 'number' ? `${data.length} ${dataName}` : dataName;
    log[debugLogs ? 'debug' : 'info'](SUBMITTERS_PUSH, [dataCountMessage]);

    const jsonPayload = JSON.stringify(fromCacheToPayload ? fromCacheToPayload(data) : data);
    if (!maxRetries) sourceCache.clear();

    return postClient(jsonPayload).then(() => {
      retries = 0;
      sourceCache.clear(); // we clear the queue if request successes.
    }).catch(err => {
      if (!maxRetries) {
        log[debugLogs ? 'debug' : 'warn'](SUBMITTERS_PUSH_FAILS, [dataCountMessage, err]);
      } else if (retries === maxRetries) {
        retries = 0;
        sourceCache.clear(); // we clear the queue if request fails after retries.
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
