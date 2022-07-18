import { ImpressionDTO } from '../../types';
import { IImpressionObserver } from '../impressionObserver/types';
import { IStrategy } from '../types';

/**
 * Debug strategy for impressions tracker. Wraps impressions to store and adds previousTime if it corresponds
 * 
 * @param observer optional impression observer. If provided, previous time (pt property) is included in impression instances
 * @returns IStrategyResult
 */
export function strategyDebugFactory(
  // if observer is provided, it implies `shouldAddPreviousTime` flag (i.e., if impressions previous time should be added or not)
  observer?: IImpressionObserver
): IStrategy {
  
  return {
    process(impressions: ImpressionDTO[]) {
      if (observer) {
        impressions.forEach((impression) => {
          // Adds previous time if it is enabled
          impression.pt = observer.testAndSet(impression);
        });
      }
      return {
        impressionsToStore: impressions, 
        impressionsToListener: impressions, 
        deduped: 0
      };
    }
  };
}
