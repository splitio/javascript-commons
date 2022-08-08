import { IUniqueKeysCacheBase } from '../types';
import { ISet, setToArray, _Set } from '../../utils/lang/sets';
import { UniqueKeysPayloadCs } from '../../sync/submitters/types';

const DEFAULT_CACHE_SIZE = 30000;

export class UniqueKeysCacheInMemoryCS implements IUniqueKeysCacheBase {

  private onFullQueue?: () => void;
  private readonly maxStorage: number;
  private uniqueTrackerSize = 0;
  private uniqueKeysTracker: { [keys: string]: ISet<string> };

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
   * key: string = key.
   * value: HashSet<string> = set of split names. 
   */
  track(key: string, featureName: string) {
    
    if (!this.uniqueKeysTracker[key]) this.uniqueKeysTracker[key] = new _Set();
    const tracker = this.uniqueKeysTracker[key];
    if (!tracker.has(featureName)) {
      tracker.add(featureName);
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
    return this.fromUniqueKeysCollector(data);
  }

  /**
   * Check if the cache is empty.
   */
  isEmpty() {
    return Object.keys(this.uniqueKeysTracker).length === 0;
  }
  
  /**
   * Converts `uniqueKeys` data from cache into request payload.
   */
  private fromUniqueKeysCollector(uniqueKeys: { [featureName: string]: ISet<string> }): UniqueKeysPayloadCs {
    const payload = [];
    const featureKeys = Object.keys(uniqueKeys);
    for (let k = 0; k < featureKeys.length; k++) {
      const featureKey = featureKeys[k];
      const featureNames = setToArray(uniqueKeys[featureKey]);
      const uniqueKeysPayload = {
        k: featureKey,
        fs: featureNames
      };

      payload.push(uniqueKeysPayload);
    }
    return { keys: payload };
  }
  
}
