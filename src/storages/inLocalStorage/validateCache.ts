import { ISettings } from '../../types';
import { isFiniteNumber, isNaNNumber } from '../../utils/lang';
import { getStorageHash } from '../KeyBuilder';
import { LOG_PREFIX } from './constants';
import type { SplitsCacheInLocal } from './SplitsCacheInLocal';
import type { MySegmentsCacheInLocal } from './MySegmentsCacheInLocal';
import { KeyBuilderCS } from '../KeyBuilderCS';
import SplitIO from '../../../types/splitio';

// milliseconds in a day
const DEFAULT_CACHE_EXPIRATION_IN_DAYS = 10;
const MILLIS_IN_A_DAY = 86400000;

function validateExpiration(options: SplitIO.InLocalStorageOptions, settings: ISettings, keys: KeyBuilderCS, currentTimestamp: number) {
  const { log } = settings;

  // Check expiration
  const cacheExpirationInDays = isFiniteNumber(options.expirationDays) && options.expirationDays >= 1 ? options.expirationDays : DEFAULT_CACHE_EXPIRATION_IN_DAYS;
  const expirationTimestamp = currentTimestamp - MILLIS_IN_A_DAY * cacheExpirationInDays;
  let value: string | number | null = localStorage.getItem(keys.buildLastUpdatedKey());
  if (value !== null) {
    value = parseInt(value, 10);
    if (!isNaNNumber(value) && value < expirationTimestamp) {
      log.info(LOG_PREFIX + 'Cache expired more than ' + cacheExpirationInDays + ' days ago. Cleaning up cache');
      return true;
    }
  }

  // Check hash
  const storageHashKey = keys.buildHashKey();
  const storageHash = localStorage.getItem(storageHashKey);
  const currentStorageHash = getStorageHash(settings);

  if (storageHash !== currentStorageHash) {
    log.info(LOG_PREFIX + 'SDK key, flags filter criteria or flags spec version was modified. Cleaning up cache');
    try {
      localStorage.setItem(storageHashKey, currentStorageHash);
    } catch (e) {
      log.error(LOG_PREFIX + e);
    }
    return true;
  }

  // Clear on init
  if (options.clearOnInit) {
    let value: string | number | null = localStorage.getItem(keys.buildLastClear());
    if (value !== null) {
      value = parseInt(value, 10);
      if (!isNaNNumber(value) && value < currentTimestamp - MILLIS_IN_A_DAY) {
        log.info(LOG_PREFIX + 'Clear on init was set and cache was cleared more than a day ago. Cleaning up cache');
        return true;
      }
    }
  }
}

/**
 * Clean cache if:
 * - it has expired, i.e., its `lastUpdated` timestamp is older than the given `expirationTimestamp`
 * - hash has changed, i.e., the SDK key, flags filter criteria or flags spec version was modified
 */
export function validateCache(options: SplitIO.InLocalStorageOptions, settings: ISettings, keys: KeyBuilderCS, splits: SplitsCacheInLocal, segments: MySegmentsCacheInLocal, largeSegments: MySegmentsCacheInLocal): boolean {

  const currentTimestamp = Date.now();

  if (validateExpiration(options, settings, keys, currentTimestamp)) {
    splits.clear();
    segments.clear();
    largeSegments.clear();

    // Update last clear timestamp
    try {
      localStorage.setItem(keys.buildLastClear(), currentTimestamp + '');
    } catch (e) {
      settings.log.error(LOG_PREFIX + e);
    }
  }

  // Check if ready from cache
  return splits.getChangeNumber() > -1;
}
