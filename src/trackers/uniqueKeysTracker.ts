import { LOG_PREFIX_UNIQUE_KEYS_TRACKER } from '../logger/constants';
import { ILogger } from '../logger/types';
import { ISet, _Set } from '../utils/lang/sets';
import { IFilterAdapter, IUniqueKeysTracker } from './types';

const noopFilterAdapter = {
  add() {return true;},
  contains() {return true;},
  clear() {}
};

const DEFAULT_CACHE_SIZE = 30000;
/**
 * Trackes uniques keys
 * Unique Keys Tracker will be in charge of checking if the MTK was already sent to the BE in the last period
 *  or schedule to be sent; if not it will be added in an internal cache and sent in the next post. 
 * 
 * @param log Logger instance
 * @param filterAdapter filter adapter
 * @param cacheSize optional internal cache size
 * @param maxBulkSize optional max MTKs bulk size
 */
export function uniqueKeysTrackerFactory(
  log: ILogger,
  filterAdapter: IFilterAdapter = noopFilterAdapter,
  cacheSize = DEFAULT_CACHE_SIZE,
  // @TODO
  // maxBulkSize: number = 5000,
): IUniqueKeysTracker {
  
  let uniqueKeysTracker: { [featureName: string]: ISet<string> } = {};
  let uniqueTrackerSize = 0;
  
  return {
    track(featureName: string, key: string): void {
      if (!filterAdapter.add(featureName, key)) {
        log.debug(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}The feature ${featureName} and key ${key} exist in the filter`);
        return;
      }
      if (!uniqueKeysTracker[featureName]) uniqueKeysTracker[featureName] = new _Set();
      const tracker = uniqueKeysTracker[featureName];
      if (!tracker.has(key)) {
        tracker.add(key);
        log.debug(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}Key ${key} added to feature ${featureName}`);
        uniqueTrackerSize++;
      }
      
      if (uniqueTrackerSize >= cacheSize) {
        log.warn(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}The UniqueKeysTracker size reached the maximum limit`);
        // @TODO trigger event to submitter to send mtk
        uniqueTrackerSize = 0;
      }
    },
    
    /**
     * Pop the collected data, used as payload for posting.
     */
    pop() {
      const data = uniqueKeysTracker;
      uniqueKeysTracker = {};
      return data;
    },

    /**
     * Clear the data stored on the cache.
     */
    clear() {
      uniqueKeysTracker = {};
    },

    /**
     * Check if the cache is empty.
     */
    isEmpty() {
      return Object.keys(uniqueKeysTracker).length === 0;
    }
    
  };

}
