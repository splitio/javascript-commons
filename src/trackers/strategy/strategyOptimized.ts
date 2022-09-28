import { IImpressionCountsCacheBase } from '../../storages/types';
import { ImpressionDTO } from '../../types';
import { truncateTimeFrame } from '../../utils/time';
import { IImpressionObserver } from '../impressionObserver/types';
import { IStrategy } from '../types';

/**
 * Optimized strategy for impressions tracker. Wraps impressions to store and adds previousTime if it corresponds
 *
 * @param impressionsObserver impression observer. previous time (pt property) is included in impression instances
 * @param impressionsCounter cache to save impressions count. impressions will be deduped (OPTIMIZED mode)
 * @returns IStrategyResult
 */
export function strategyOptimizedFactory(
  impressionsObserver: IImpressionObserver,
  impressionsCounter: IImpressionCountsCacheBase,
): IStrategy {

  return {
    process(impressions: ImpressionDTO[]) {
      const impressionsToStore: ImpressionDTO[] = [];
      impressions.forEach((impression) => {
        impression.pt = impressionsObserver.testAndSet(impression);

        const now = Date.now();

        // Increments impression counter per featureName
        if (impression.pt) impressionsCounter.track(impression.feature, now, 1);

        // Checks if the impression should be added in queue to be sent
        if (!impression.pt || impression.pt < truncateTimeFrame(now)) {
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
