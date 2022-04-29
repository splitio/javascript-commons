import { IEventsCacheSync } from '../../storages/types';
import { IPostEventsBulk } from '../../services/types';
import { submitterFactory, firstPushWindowDecorator } from './submitter';
import { ILogger } from '../../logger/types';
import { SUBMITTERS_PUSH_FULL_QUEUE } from '../../logger/constants';

const DATA_NAME = 'events';

/**
 * Submitter that periodically posts tracked events
 */
export function eventsSubmitterFactory(
  log: ILogger,
  postEventsBulk: IPostEventsBulk,
  eventsCache: IEventsCacheSync,
  eventsPushRate: number,
  eventsFirstPushWindow: number,
) {

  // don't retry events.
  let submitter = submitterFactory(log, postEventsBulk, eventsCache, eventsPushRate, DATA_NAME);

  // Set a timer for the first push window of events.
  if (eventsFirstPushWindow > 0) submitter = firstPushWindowDecorator(submitter, eventsFirstPushWindow);

  // register events submitter to be executed when events cache is full
  eventsCache.setOnFullQueueCb(() => {
    if (submitter.isRunning()) {
      log.info(SUBMITTERS_PUSH_FULL_QUEUE, [DATA_NAME]);
      submitter.execute();
    }
    // If submitter is stopped (e.g., user consent declined or unknown, or app state offline), we don't send the data.
    // Data will be sent when submitter is resumed.
  });

  return submitter;
}
