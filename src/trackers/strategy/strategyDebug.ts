import SplitIO from '../../../types/splitio';
import { IImpressionObserver } from '../impressionObserver/types';
import { IStrategy } from '../types';

/**
 * Debug strategy for impressions tracker. Wraps impressions to store and adds previousTime if it corresponds
 *
 * @param impressionsObserver - impression observer. Previous time (pt property) is included in impression instances
 * @returns Debug strategy
 */
export function strategyDebugFactory(
  impressionsObserver: IImpressionObserver
): IStrategy {

  return {
    process(impression: SplitIO.ImpressionDTO) {
      impression.pt = impressionsObserver.testAndSet(impression);
      return true;
    }
  };
}
