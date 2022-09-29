import { IImpressionCountsCacheBase } from '../../storages/types';
import { ImpressionDTO } from '../../types';
import { IStrategy, IUniqueKeysTracker } from '../types';

/**
 * None strategy for impressions tracker.
 *
 * @param impressionsCounter cache to save impressions count. impressions will be deduped (OPTIMIZED mode)
 * @param uniqueKeysTracker unique keys tracker in charge of tracking the unique keys per split.
 * @returns IStrategyResult
 */
export function strategyNoneFactory(
  impressionsCounter: IImpressionCountsCacheBase,
  uniqueKeysTracker: IUniqueKeysTracker
): IStrategy {

  return {
    process(impressions: ImpressionDTO[]) {
      impressions.forEach((impression) => {
        const now = Date.now();
        // Increments impression counter per featureName
        impressionsCounter.track(impression.feature, now, 1);
        // Keep track by unique key
        uniqueKeysTracker.track(impression.keyName, impression.feature);
      });

      return {
        impressionsToStore: [],
        impressionsToListener: impressions,
        deduped: 0
      };
    }
  };
}
