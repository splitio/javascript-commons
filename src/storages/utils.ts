// Shared utils for Redis and Pluggable storages.

import { IMetadata } from '../dtos/types';
import { StoredImpressionWithMetadata } from '../sync/submitters/types';
import { ImpressionDTO } from '../types';

/**
 * Converts impressions to be stored in Redis or pluggable storage.
 */
export function impressionsToJSON(impressions: ImpressionDTO[], metadata: IMetadata): string[] {
  return impressions.map(impression => {
    const impressionWithMetadata: StoredImpressionWithMetadata = {
      m: metadata,
      i: {
        k: impression.keyName,
        b: impression.bucketingKey,
        f: impression.feature,
        t: impression.treatment,
        r: impression.label,
        c: impression.changeNumber,
        m: impression.time,
        pt: impression.pt,
      }
    };

    return JSON.stringify(impressionWithMetadata);
  });
}
