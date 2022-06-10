import { truncateTimeFrame } from '../../utils/time';
import { IImpressionCountsCacheSync } from '../types';

export class ImpressionCountsCacheInMemory implements IImpressionCountsCacheSync {
  private cache: Record<string, number> = {};

  /**
  * Builds key to be stored in the cache with the featureName and the timeFrame truncated.
  */
  private _makeKey(featureName: string, timeFrame: number) {
    return `${featureName}::${truncateTimeFrame(timeFrame)}`;
  }

  /**
  * Increments the quantity of impressions with the passed featureName and timeFrame.
  */
  track(featureName: string, timeFrame: number, amount: number) {
    const key = this._makeKey(featureName, timeFrame);
    const currentAmount = this.cache[key];
    this.cache[key] = currentAmount ? currentAmount + amount : amount;
  }



  /**
   * Pop the collected data, used as payload for posting.
   */
  pop() {
    const data = this.cache;
    this.clear();
    return data;
  }

  /**
   * Clear the data stored on the cache.
   */
  clear() {
    this.cache = {};
  }

  /**
   * Check if the cache is empty.
   */
  isEmpty() {
    return Object.keys(this.cache).length === 0;
  }
}
