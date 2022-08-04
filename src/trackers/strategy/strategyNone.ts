import { IImpressionCountsCacheSync } from '../../storages/types';
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
  impressionsCounter: IImpressionCountsCacheSync,
  uniqueKeysTracker: IUniqueKeysTracker
): IStrategy {
  
  return {
    process(impressions: ImpressionDTO[], isClientSide: boolean) {
      impressions.forEach((impression) => {        
        const now = Date.now();
        // Increments impression counter per featureName
        impressionsCounter.track(impression.feature, now, 1);
        // Keep track by unique key
        const key = isClientSide ? impression.keyName : impression.feature;
        const value = isClientSide ? impression.feature : impression.keyName;
        uniqueKeysTracker.track(key, value);
      });
      
      return {
        impressionsToStore: [], 
        impressionsToListener: impressions, 
        deduped: 0
      };
    }
  };
}
