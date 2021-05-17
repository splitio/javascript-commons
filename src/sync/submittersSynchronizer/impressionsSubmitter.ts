/* eslint-disable */
import { ILogger } from '../../logger/types';
import { IPostTestImpressionsBulk } from '../../services/types';
import { IImpressionsCacheSync } from '../../storages/types';
import { fromImpressionsCollector } from '../submitters/impressionsSyncTask';


export function impressionsSubmitterFactory(
  log: ILogger,
  postTestImpressionsBulk: IPostTestImpressionsBulk,
  impressionsCache: IImpressionsCacheSync,
  // @TODO not sure if we should consider some additional parameter from the user config, like `labelsEnabled`, `retriesOnFailure` (0 by default)
) {

  // Similar interface than split|segmentChangesUpdater:
  // returns a promise that resolves after impressions were removed from the storage, processed and sent to the backend.
  // Reject with the error (storage error or error POSTing events to the backend)
  return function impressionsSubmitter() {
    throw new Error('Not implemented yet');
  };
}
