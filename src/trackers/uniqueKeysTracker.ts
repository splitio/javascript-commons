import { LOG_PREFIX_UNIQUE_KEYS_TRACKER } from '../logger/constants';
import { ILogger } from '../logger/types';
import { IFilterAdapter, IImpressionSenderAdapter, IUniqueKeysTracker } from './types';

/**
 * Trackes uniques keys
 * Unique Keys Tracker will be in charge of checking if the MTK was already sent to the BE in the last period
 *  or schedule to be sent; if not it will be added in an internal cache and sent in the next post. 
 * 
 * @param log Logger instance
 * @param senderAdapter Impressions sender adapter
 * @param filterAdapter optional filter adapter
 * @param cacheSize optional internal cache size
 * @param maxBulkSize optional max MTKs bulk size
 * @param taskRefreshRate optional task refresh rate
 */
export function uniqueKeysTrackerFactory(
  log: ILogger,
  senderAdapter: IImpressionSenderAdapter,
  filterAdapter?: IFilterAdapter | undefined,
  cacheSize: number = 3000,
  // @TODO
  // maxBulkSize: number = 5000,
  // taskRefreshRate: number = 15,
): IUniqueKeysTracker {
  
  let uniqueKeysTracker: { [key: string]: string[] } = {};
  
  return {
    track(featureName: string, key: string): boolean {
      if (filterAdapter && !filterAdapter.add(featureName, key)) {
        log.debug(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}The feature ${featureName} and key ${key} exist in the filter`);
        return false;
      }
      let uniqueKeys: string[] = [];
      if (uniqueKeysTracker[featureName]) {
        uniqueKeys = uniqueKeysTracker[featureName];
        if (!filterAdapter && uniqueKeys.indexOf(key) > -1) {
          log.debug(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}The feature ${featureName} and key ${key} exist in the UniqueKeysTracker`);
          return false;
        }
      }
      uniqueKeys.push(key);
      uniqueKeysTracker[featureName] = uniqueKeys;
      log.debug(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}The feature ${featureName} and key ${key} was added`);
      if (getUniqueKeysTrackerSize() === cacheSize){
        log.warn(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}The UniqueKeysTracker size reached the maximum limit`);
        try {
          sendUniqueKeys();
        } catch (error) {
          log.error(`Error sending unique keys. ${error}`);
        }
      }
      return true;
    },
    
    start(): void {
      // @TODO
    },
    
    stop(): void {
      // @TODO
    }
    
  };
  
  function sendUniqueKeys(): void {
    // @TODO
    senderAdapter.recordUniqueKeys({});
  }
  
  function getUniqueKeysTrackerSize(): number {
    let result = 0;
    Object.keys(uniqueKeysTracker).forEach(key => {
      result += uniqueKeysTracker[key].length;
    });
    return result;
  } 
}
