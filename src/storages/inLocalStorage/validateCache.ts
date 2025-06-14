import { ISettings } from '../../types';
import { isFiniteNumber, isNaNNumber } from '../../utils/lang';
import { getStorageHash } from '../KeyBuilder';
import { LOG_PREFIX } from './constants';
import type { SplitsCacheInLocal } from './SplitsCacheInLocal';
import type { RBSegmentsCacheInLocal } from './RBSegmentsCacheInLocal';
import type { MySegmentsCacheInLocal } from './MySegmentsCacheInLocal';
import { KeyBuilderCS } from '../KeyBuilderCS';
import SplitIO from '../../../types/splitio';

const DEFAULT_CACHE_EXPIRATION_IN_DAYS = 10;
const MILLIS_IN_A_DAY = 86400000;

/**
 * Validates if cache should be cleared and sets the cache `hash` if needed.
 *
 * @returns `true` if cache should be cleared, `false` otherwise
 */
function validateExpiration(options: SplitIO.InLocalStorageOptions, settings: ISettings, keys: KeyBuilderCS, currentTimestamp: number, isThereCache: boolean) {
  const { log } = settings;

  // Check expiration
  const lastUpdatedTimestamp = parseInt(localStorage.getItem(keys.buildLastUpdatedKey()) as string, 10);
  if (!isNaNNumber(lastUpdatedTimestamp)) {
    const cacheExpirationInDays = isFiniteNumber(options.expirationDays) && options.expirationDays >= 1 ? options.expirationDays : DEFAULT_CACHE_EXPIRATION_IN_DAYS;
    const expirationTimestamp = currentTimestamp - MILLIS_IN_A_DAY * cacheExpirationInDays;
    if (lastUpdatedTimestamp < expirationTimestamp) {
      log.info(LOG_PREFIX + 'Cache expired more than ' + cacheExpirationInDays + ' days ago. Cleaning up cache');
      return true;
    }
  }

  // Check hash
  const storageHashKey = keys.buildHashKey();
  const storageHash = localStorage.getItem(storageHashKey);
  const currentStorageHash = getStorageHash(settings);

  if (storageHash !== currentStorageHash) {
    try {
      localStorage.setItem(storageHashKey, currentStorageHash);
    } catch (e) {
      log.error(LOG_PREFIX + e);
    }
    if (isThereCache) {
      log.info(LOG_PREFIX + 'SDK key, flags filter criteria, or flags spec version has changed. Cleaning up cache');
      return true;
    }
    return false; // No cache to clear
  }

  // Clear on init
  if (options.clearOnInit) {
    const lastClearTimestamp = parseInt(localStorage.getItem(keys.buildLastClear()) as string, 10);

    if (isNaNNumber(lastClearTimestamp) || lastClearTimestamp < currentTimestamp - MILLIS_IN_A_DAY) {
      log.info(LOG_PREFIX + 'clearOnInit was set and cache was not cleared in the last 24 hours. Cleaning up cache');
      return true;
    }
  }
}

/**
 * Clean cache if:
 * - it has expired, i.e., its `lastUpdated` timestamp is older than the given `expirationTimestamp`
 * - its hash has changed, i.e., the SDK key, flags filter criteria or flags spec version was modified
 * - `clearOnInit` was set and cache was not cleared in the last 24 hours
 *
 * @returns `true` if cache is ready to be used, `false` otherwise (cache was cleared or there is no cache)
 */
export function validateCache(options: SplitIO.InLocalStorageOptions, settings: ISettings, keys: KeyBuilderCS, splits: SplitsCacheInLocal, rbSegments: RBSegmentsCacheInLocal, segments: MySegmentsCacheInLocal, largeSegments: MySegmentsCacheInLocal): boolean {

  const currentTimestamp = Date.now();
  const isThereCache = splits.getChangeNumber() > -1;

  if (validateExpiration(options, settings, keys, currentTimestamp, isThereCache)) {
    splits.clear();
    rbSegments.clear();
    segments.clear();
    largeSegments.clear();

    // Update last clear timestamp
    try {
      localStorage.setItem(keys.buildLastClear(), currentTimestamp + '');
    } catch (e) {
      settings.log.error(LOG_PREFIX + e);
    }

    return false;
  }

  // Check if ready from cache
  return isThereCache;
}
