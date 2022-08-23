import { truncateTimeFrame } from '../../utils/time';
import { IImpressionCountsCacheSync } from '../types';
const DEFAULT_CACHE_SIZE = 30000;

export class ImpressionCountsCacheInMemory implements IImpressionCountsCacheSync {
  protected cache: Record<string, number> = {};
  private readonly maxStorage: number;
  protected onFullQueue?: () => void;
  
  constructor(impressionCountsCacheSize: number = DEFAULT_CACHE_SIZE) {
    this.maxStorage = impressionCountsCacheSize;
  }

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
    if (Object.keys(this.cache).length >= this.maxStorage && this.onFullQueue) {
      this.onFullQueue();
    }
  }



  /**
   * Pop the collected data, used as payload for posting.
   */
  pop(toMerge?: Record<string, number>) {
    const data = this.cache;
    this.clear();
    if (toMerge) {
      Object.keys(data).forEach((key) => {
        if (toMerge[key]) toMerge[key] += data[key];
        else toMerge[key] = data[key];
      });
      return toMerge;
    }
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
