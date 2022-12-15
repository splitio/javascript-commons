import { IUniqueKeysCacheBase } from '../types';
import { ISet, setToArray, _Set } from '../../utils/lang/sets';
import { UniqueKeysPayloadSs } from '../../sync/submitters/types';
import { DEFAULT_CACHE_SIZE } from '../inRedis/constants';

/**
 * Converts `uniqueKeys` data from cache into request payload for SS.
 */
export function fromUniqueKeysCollector(uniqueKeys: { [featureName: string]: ISet<string> }): UniqueKeysPayloadSs {
  const payload = [];
  const featureNames = Object.keys(uniqueKeys);
  for (let i = 0; i < featureNames.length; i++) {
    const featureName = featureNames[i];
    const userKeys = setToArray(uniqueKeys[featureName]);
    const uniqueKeysPayload = {
      f: featureName,
      ks: userKeys
    };

    payload.push(uniqueKeysPayload);
  }
  return { keys: payload };
}

export class UniqueKeysCacheInMemory implements IUniqueKeysCacheBase {

  protected onFullQueue?: () => void;
  private readonly maxStorage: number;
  private uniqueTrackerSize = 0;
  protected uniqueKeysTracker: { [featureName: string]: ISet<string> } = {};

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
    if (!this.uniqueKeysTracker[featureName]) this.uniqueKeysTracker[featureName] = new _Set();
    const tracker = this.uniqueKeysTracker[featureName];
    if (!tracker.has(userKey)) {
      tracker.add(userKey);
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
    return fromUniqueKeysCollector(data);
  }

  /**
   * Check if the cache is empty.
   */
  isEmpty() {
    return Object.keys(this.uniqueKeysTracker).length === 0;
  }

}
