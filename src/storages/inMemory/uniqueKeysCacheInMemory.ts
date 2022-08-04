import { IUniqueKeysCacheBase } from '../types';
import { ISet, _Set } from '../../utils/lang/sets';

const DEFAULT_CACHE_SIZE = 30000;

export class UniqueKeysCacheInMemory implements IUniqueKeysCacheBase {

  private onFullQueue?: () => void;
  private readonly maxStorage: number;
  private uniqueTrackerSize = 0;
  private uniqueKeysTracker: { [key: string]: ISet<string> };

  /**
   *
   * @param impressionsQueueSize number of queued impressions to call onFullQueueCb.
   * Default value is 0, that means no maximum value, in case we want to avoid this being triggered.
   */
  constructor(uniqueKeysQueueSize: number = DEFAULT_CACHE_SIZE) {
    this.maxStorage = uniqueKeysQueueSize;
    this.uniqueKeysTracker = {};
  }

  setOnFullQueueCb(cb: () => void) {
    this.onFullQueue = cb;
  }

  /**
   * Store unique keys in sequential order
   */
  track(key: string, value: string) {
    
    if (!this.uniqueKeysTracker[key]) this.uniqueKeysTracker[key] = new _Set();
    const tracker = this.uniqueKeysTracker[key];
    if (!tracker.has(value)) {
      tracker.add(value);
      this.uniqueTrackerSize++;
    }
    
    if (this.uniqueTrackerSize >= this.maxStorage && this.onFullQueue) {
      this.uniqueTrackerSize = 0;
      this.onFullQueue();
    }
  }

  /**
   * Clear the data stored on the cache.
   */
  clear() {
    this.uniqueKeysTracker = {};
  }

  /**
   * Pop the collected data, used as payload for posting.
   */
  pop() {
    const data = this.uniqueKeysTracker;
    this.uniqueKeysTracker = {};
    return data;
  }

  /**
   * Check if the cache is empty.
   */
  isEmpty() {
    return Object.keys(this.uniqueKeysTracker).length === 0;
  }
  
}
