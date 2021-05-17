import { ILogger } from '../../logger/types';
import { IPostEventsBulk } from '../../services/types';
import { IEventsCacheAsync } from '../../storages/types';

// maximum allowed event size
const MAX_EVENT_SIZE = 1024 * 32;

// maximum number of bytes to be fetched from cache before posting to the backend
const MAX_QUEUE_BYTE_SIZE = 5 * 1024 * 1024; // 5MB


export function eventsSubmitterFactory(
  log: ILogger,
  postEventsBulk: IPostEventsBulk,
  eventsCache: IEventsCacheAsync,
  // @TODO not sure if we should consider some additional parameter from the user config, like `retriesOnFailure` (0 by default)
) {

  // Similar interface than split|segmentChangesUpdater:
  // returns a promise that resolves after events were removed from the storage, processed and sent to the backend.
  // Reject with the error (storage error or error POSTing events to the backend)
  return function eventsSubmitter() {
    throw new Error('Not implemented yet');
  };
}
