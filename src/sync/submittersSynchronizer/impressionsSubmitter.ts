/* eslint-disable */
import { ILogger } from '../../logger/types';
import { IPostTestImpressionsBulk } from '../../services/types';
import { IImpressionsCacheAsync } from '../../storages/types';


export function impressionsSubmitterFactory(
  log: ILogger,
  postTestImpressionsBulk: IPostTestImpressionsBulk,
  impressionsCache: IImpressionsCacheAsync,
  // @TODO not sure if we should consider some additional parameter from the user config, like `labelsEnabled`, `retriesOnFailure` (0 by default)
) {

  // Similar interface than split|segmentChangesUpdater:
  // returns a promise that resolves after impressions were removed from the storage, processed and sent to the backend.
  // Reject with the error (storage error or error POSTing events to the backend)
  return function impressionsSubmitter() {
    return impressionsCache.count().then(count => {
      return impressionsCache.popNWithMetadata(count).then(impressions => {
        const impressionsPayload = processImpressions(impressions);
        return postTestImpressionsBulk(JSON.stringify(impressionsPayload));
      });
    });
  };
}
