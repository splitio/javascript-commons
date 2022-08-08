import { IUniqueKeysCacheBase } from '../types';
import { ISet, setToArray, _Set } from '../../utils/lang/sets';
import { UniqueKeysPayloadSs } from '../../sync/submitters/types';

const DEFAULT_CACHE_SIZE = 30000;

export class UniqueKeysCacheInMemory implements IUniqueKeysCacheBase {

  private onFullQueue?: () => void;
  private readonly maxStorage: number;
  private uniqueTrackerSize = 0;
  private uniqueKeysTracker: { [keys: string]: ISet<string> };

  constructor(uniqueKeysQueueSize: number = DEFAULT_CACHE_SIZE) {
    this.maxStorage = uniqueKeysQueueSize;
    this.uniqueKeysTracker = {};
  }

  setOnFullQueueCb(cb: () => void) {
    this.onFullQueue = cb;
  }

  /**
   * Store unique keys in sequential order
   * key: string = feature name.
   * value: Set<string> = set of unique keys. 
   */
  track(key: string, featureName: string) {
    if (!this.uniqueKeysTracker[featureName]) this.uniqueKeysTracker[featureName] = new _Set();
    const tracker = this.uniqueKeysTracker[featureName];
    if (!tracker.has(key)) {
      tracker.add(key);
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
   * Converts `uniqueKeys` data from cache into request payload for SS.
   */
  private fromUniqueKeysCollector(uniqueKeys: { [featureName: string]: ISet<string> }): UniqueKeysPayloadSs {
    const payload = [];
    const featureNames = Object.keys(uniqueKeys);
    for (let i = 0; i < featureNames.length; i++) {
      const featureName = featureNames[i];
      const featureKeys = setToArray(uniqueKeys[featureName]);
      const uniqueKeysPayload = {
        f: featureName,
        ks: featureKeys
      };

      payload.push(uniqueKeysPayload);
    }
    return { keys: payload };
  }
  
}
