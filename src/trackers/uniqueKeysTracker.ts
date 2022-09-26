import { LOG_PREFIX_UNIQUE_KEYS_TRACKER } from '../logger/constants';
import { ILogger } from '../logger/types';
import { IUniqueKeysCacheBase } from '../storages/types';
import { IFilterAdapter, IUniqueKeysTracker } from './types';

const noopFilterAdapter = {
  add() { return true; },
  contains() { return true; },
  clear() { }
};

/**
 * Trackes uniques keys
 * Unique Keys Tracker will be in charge of checking if the MTK was already sent to the BE in the last period
 * or schedule to be sent; if not it will be added in an internal cache and sent in the next post.
 *
 * @param log Logger instance
 * @param uniqueKeysCache cache to save unique keys
 * @param filterAdapter filter adapter
 */
export function uniqueKeysTrackerFactory(
  log: ILogger,
  uniqueKeysCache: IUniqueKeysCacheBase,
  filterAdapter: IFilterAdapter = noopFilterAdapter,
): IUniqueKeysTracker {
  let intervalId: any;

  if (filterAdapter.refreshRate) {
    intervalId = setInterval(filterAdapter.clear, filterAdapter.refreshRate);
  }

  return {

    track(key: string, featureName: string): void {
      if (!filterAdapter.add(key, featureName)) {
        log.debug(`${LOG_PREFIX_UNIQUE_KEYS_TRACKER}The feature ${featureName} and key ${key} exist in the filter`);
        return;
      }
      uniqueKeysCache.track(key, featureName);
    },

    stop(): void {
      clearInterval(intervalId);
    }

  };

}
