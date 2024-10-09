import { IUniqueKeysCacheBase } from '../types';
import { UniqueKeysPayloadCs } from '../../sync/submitters/types';
import { DEFAULT_CACHE_SIZE } from '../inRedis/constants';
import { setToArray } from '../../utils/lang/sets';

export class UniqueKeysCacheInMemoryCS implements IUniqueKeysCacheBase {

  private onFullQueue?: () => void;
  private readonly maxStorage: number;
  private uniqueTrackerSize = 0;
  private uniqueKeysTracker: { [userKey: string]: Set<string> } = {};

  /**
   *
   * @param impressionsQueueSize number of queued impressions to call onFullQueueCb.
   * Default value is 0, that means no maximum value, in case we want to avoid this being triggered.
   */
  constructor(uniqueKeysQueueSize = DEFAULT_CACHE_SIZE) {
    this.maxStorage = uniqueKeysQueueSize;
  }

  setOnFullQueueCb(cb: () => void) {
    this.onFullQueue = cb;
  }

  /**
   * Store unique keys per feature.
   */
  track(userKey: string, featureName: string) {

    if (!this.uniqueKeysTracker[userKey]) this.uniqueKeysTracker[userKey] = new Set();
    const tracker = this.uniqueKeysTracker[userKey];
    if (!tracker.has(featureName)) {
      tracker.add(featureName);
      this.uniqueTrackerSize++;
    }
    if (this.uniqueTrackerSize >= this.maxStorage && this.onFullQueue) {
      this.onFullQueue();
    }
  }

  /**
   * Clear the data stored on the cache.
   */
  clear() {
    this.uniqueTrackerSize = 0;
    this.uniqueKeysTracker = {};
  }

  /**
   * Pop the collected data, used as payload for posting.
   */
  pop() {
    const data = this.uniqueKeysTracker;
    this.clear();
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
  private fromUniqueKeysCollector(uniqueKeys: { [userKey: string]: Set<string> }): UniqueKeysPayloadCs {
    const payload = [];
    const userKeys = Object.keys(uniqueKeys);
    for (let k = 0; k < userKeys.length; k++) {
      const userKey = userKeys[k];
      const featureNames = setToArray(uniqueKeys[userKey]);
      const uniqueKeysPayload = {
        k: userKey,
        fs: featureNames
      };

      payload.push(uniqueKeysPayload);
    }
    return { keys: payload };
  }

}
