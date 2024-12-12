import { IImpressionCountsCacheBase } from '../../storages/types';
import SplitIO from '../../../types/splitio';
import { IStrategy, IUniqueKeysTracker } from '../types';

/**
 * None strategy for impressions tracker.
 *
 * @param impressionCounts - cache to save impressions count. impressions will be deduped (OPTIMIZED mode)
 * @param uniqueKeysTracker - unique keys tracker in charge of tracking the unique keys per split.
 * @returns None strategy
 */
export function strategyNoneFactory(
  impressionCounts: IImpressionCountsCacheBase,
  uniqueKeysTracker: IUniqueKeysTracker
): IStrategy {

  return {
    process(impression: SplitIO.ImpressionDTO) {
      const now = Date.now();
      // Increments impression counter per featureName
      impressionCounts.track(impression.feature, now, 1);
      // Keep track by unique key
      uniqueKeysTracker.track(impression.keyName, impression.feature);
      // Do not store impressions
      return false;
    }
  };
}
