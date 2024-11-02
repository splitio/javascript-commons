import SplitIO from '../../../types/splitio';
import { IImpressionObserver } from '../impressionObserver/types';
import { IStrategy } from '../types';

/**
 * Debug strategy for impressions tracker. Wraps impressions to store and adds previousTime if it corresponds
 *
 * @param impressionsObserver - impression observer. Previous time (pt property) is included in impression instances
 * @returns IStrategyResult
 */
export function strategyDebugFactory(
  impressionsObserver: IImpressionObserver
): IStrategy {

  return {
    process(impressions: SplitIO.ImpressionDTO[]) {
      impressions.forEach((impression) => {
        // Adds previous time if it is enabled
        impression.pt = impressionsObserver.testAndSet(impression);
      });
      return {
        impressionsToStore: impressions,
        impressionsToListener: impressions,
        deduped: 0
      };
    }
  };
}
