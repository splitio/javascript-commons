import { LOG_PREFIX_UNIQUE_KEYS_TRACKER } from '../logger/constants';
import { ILogger } from '../logger/types';
import { ISet, _Set } from '../utils/lang/sets';
import { IFilterAdapter, IImpressionSenderAdapter, IUniqueKeysTracker } from './types';

const DEFAULT_CACHE_SIZE = 30000;
/**
 * Trackes uniques keys
 * Unique Keys Tracker will be in charge of checking if the MTK was already sent to the BE in the last period
 *  or schedule to be sent; if not it will be added in an internal cache and sent in the next post. 
 * 
 * @param log Logger instance
 * @param senderAdapter Impressions sender adapter
 * @param filterAdapter filter adapter
 * @param cacheSize optional internal cache size
 * @param maxBulkSize optional max MTKs bulk size
 * @param taskRefreshRate optional task refresh rate
 */
export function uniqueKeysTrackerFactory(
  log: ILogger,
  senderAdapter: IImpressionSenderAdapter,
  filterAdapter: IFilterAdapter,
  cacheSize: number = DEFAULT_CACHE_SIZE,
  // @TODO
  // maxBulkSize: number = 5000,
  // taskRefreshRate: number = 15,
): IUniqueKeysTracker {
  
  const uniqueKeysTracker: { [featureName: string]: ISet<string> } = {};
  let uniqueTrackerSize = 0;
  
  return {
    track(featureName: string, key: string): void {
      if (!filterAdapter.add(featureName, key)) {
        log.debug(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}The feature ${featureName} and key ${key} exist in the filter`);
        return;
      }
      let tracker = uniqueKeysTracker[featureName];
      if (!tracker) {
        tracker = new _Set();
      }
      if (!tracker.has(key)) {
        tracker.add(key);
        uniqueKeysTracker[featureName] = tracker;
        log.debug(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}Key ${key} added to feature ${featureName}`);
        uniqueTrackerSize++;
      }
      
      if (uniqueTrackerSize >= cacheSize) {
        log.warn(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}The UniqueKeysTracker size reached the maximum limit`);
        senderAdapter.recordUniqueKeys(uniqueKeysTracker);
        uniqueTrackerSize = 0;
      }
    },
    
    start(): void {
      // @TODO
    },
    
    stop(): void {
      // @TODO
    }
    
  };

}
