import { LOG_PREFIX_UNIQUE_KEYS_TRACKER } from '../logger/constants';
import { ILogger } from '../logger/types';
import { ISet } from '../utils/lang/sets';
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
  
  // let uniqueKeysTracker: { [key: string]: string[] } = {};
  const uniqueKeysTracker: { [featureName: string]: ISet<string> } = {};
  let uniqueTrackerSize = 0;
  
  return {
    track(featureName: string, key: string): void {
      if (!filterAdapter.add(featureName, key)) {
        log.debug(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}The feature ${featureName} and key ${key} exist in the filter`);
        return;
      }
      if (!uniqueKeysTracker[featureName]) {
        uniqueKeysTracker[featureName] = new Set();
        log.debug(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}Feature ${featureName} added to UniqueKeysTracker`);
      }
      if (!uniqueKeysTracker[featureName].has(key)) {
        uniqueKeysTracker[featureName].add(key);
        log.debug(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}Key ${key} added to feature ${featureName}`);
        uniqueTrackerSize++;
      }
      
      if (uniqueTrackerSize === cacheSize) {
        log.warn(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}The UniqueKeysTracker size reached the maximum limit`);
        try {
          sendUniqueKeys(uniqueKeysTracker);
          uniqueTrackerSize = 0;
        } catch (error) {
          log.error(`Error sending unique keys. ${error}`);
        }
      }
    },
    
    start(): void {
      // @TODO
    },
    
    stop(): void {
      // @TODO
    }
    
  };
  
  function sendUniqueKeys(uniqueKeysTracker: { [featureName: string]: ISet<string> }): void {
    // @TODO
    senderAdapter.recordUniqueKeys(uniqueKeysTracker);
  }
}
