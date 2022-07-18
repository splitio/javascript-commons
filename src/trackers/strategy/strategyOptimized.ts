import { IImpressionCountsCacheSync } from '../../storages/types';
import { ImpressionDTO } from '../../types';
import { truncateTimeFrame } from '../../utils/time';
import { IImpressionObserver } from '../impressionObserver/types';
import { IStrategy } from '../types';

/**
 * Optimized strategy for impressions tracker. Wraps impressions to store and adds previousTime if it corresponds
 * 
 * @param observer optional impression observer. If provided, previous time (pt property) is included in impression instances
 * @param countsCache optional cache to save impressions count. If provided, impressions will be deduped (OPTIMIZED mode)
 * @returns IStrategyResult
 */
export function strategyOptimizedFactory(
  // if observer is provided, it implies `shouldAddPreviousTime` flag (i.e., if impressions previous time should be added or not)
  observer?: IImpressionObserver,
  // if countsCache is provided, it implies `isOptimized` flag (i.e., if impressions should be deduped or not)
  countsCache?: IImpressionCountsCacheSync,
): IStrategy {
  
  return {
    process(impressions: ImpressionDTO[]) {
      const impressionsToStore: ImpressionDTO[] = [];
      impressions.forEach((impression) => {
        if (observer) {
          // Adds previous time if it is enabled
          impression.pt = observer.testAndSet(impression);
        }
        
        const now = Date.now();
        if (countsCache) {
          // Increments impression counter per featureName
          countsCache.track(impression.feature, now, 1);
        }
  
        // Checks if the impression should be added in queue to be sent
        if (!countsCache || !impression.pt || impression.pt < truncateTimeFrame(now)) {
          impressionsToStore.push(impression);
        }
      });
      return {
        impressionsToStore: impressionsToStore, 
        impressionsToListener: impressions, 
        deduped: impressions.length - impressionsToStore.length
      };
    }
  };
}
