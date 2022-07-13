import { ImpressionDTO } from '../../types';
import { IImpressionObserver } from '../impressionObserver/types';
import { IStrategy } from '../types';

export function strategyDebugFactory(
  observer: IImpressionObserver
): IStrategy {
  
  return {
    process(impressions: ImpressionDTO[]) {
      impressions.forEach((impression) => {
        impression.pt = observer.testAndSet(impression);
      });
      return {
        impressionsToStore: impressions, 
        impressionsToListener: impressions, 
        deduped: 0
      };
    }
  };
}
