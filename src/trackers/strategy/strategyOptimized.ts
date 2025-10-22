import { IImpressionCountsCacheBase } from '../../storages/types';
import SplitIO from '../../../types/splitio';
import { truncateTimeFrame } from '../../utils/time';
import { IImpressionObserver } from '../impressionObserver/types';
import { IStrategy } from '../types';

/**
 * Optimized strategy for impressions tracker. Wraps impressions to store and adds previousTime if it corresponds
 *
 * @param impressionsObserver - impression observer. previous time (pt property) is included in impression instances
 * @param impressionCounts - cache to save impressions count. impressions will be deduped (OPTIMIZED mode)
 * @returns Optimized strategy
 */
export function strategyOptimizedFactory(
  impressionsObserver: IImpressionObserver,
  impressionCounts: IImpressionCountsCacheBase,
): IStrategy {

  return {
    process(impression: SplitIO.ImpressionDTO) {
      // DEBUG mode without previous time, for impressions with properties
      if (impression.properties) return true;

      impression.pt = impressionsObserver.testAndSet(impression);

      const now = Date.now();

      // Increments impression counter per featureName
      if (impression.pt) impressionCounts.track(impression.feature, now, 1);

      // Checks if the impression should be added in queue to be sent
      return (!impression.pt || impression.pt < truncateTimeFrame(now)) ? true : false;
    }
  };
}
