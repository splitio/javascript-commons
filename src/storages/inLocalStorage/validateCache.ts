import { ISettings } from '../../types';
import { DEFAULT_CACHE_EXPIRATION_IN_MILLIS } from '../../utils/constants/browser';
import { isNaNNumber } from '../../utils/lang';
import { getStorageHash } from '../KeyBuilder';
import { LOG_PREFIX } from './constants';
import type { SplitsCacheInLocal } from './SplitsCacheInLocal';
import type { MySegmentsCacheInLocal } from './MySegmentsCacheInLocal';
import { KeyBuilderCS } from '../KeyBuilderCS';

function validateExpiration(settings: ISettings, keys: KeyBuilderCS) {
  const { log } = settings;

  // Check expiration
  const expirationTimestamp = Date.now() - DEFAULT_CACHE_EXPIRATION_IN_MILLIS;
  let value: string | number | null = localStorage.getItem(keys.buildLastUpdatedKey());
  if (value !== null) {
    value = parseInt(value, 10);
    if (!isNaNNumber(value) && value < expirationTimestamp) return true;
  }

  // Check hash
  const storageHashKey = keys.buildHashKey();
  const storageHash = localStorage.getItem(storageHashKey);
  const currentStorageHash = getStorageHash(settings);

  if (storageHash !== currentStorageHash) {
    log.info(LOG_PREFIX + 'SDK key, flags filter criteria or flags spec version was modified. Updating cache');
    try {
      localStorage.setItem(storageHashKey, currentStorageHash);
    } catch (e) {
      log.error(LOG_PREFIX + e);
    }
    return true;
  }
}

/**
 * Clean cache if:
 * - it has expired, i.e., its `lastUpdated` timestamp is older than the given `expirationTimestamp`
 * - hash has changed, i.e., the SDK key, flags filter criteria or flags spec version was modified
 */
export function validateCache(settings: ISettings, keys: KeyBuilderCS, splits: SplitsCacheInLocal, segments: MySegmentsCacheInLocal, largeSegments: MySegmentsCacheInLocal): boolean {

  if (validateExpiration(settings, keys)) {
    splits.clear();
    segments.clear();
    largeSegments.clear();
  }

  // Check if the cache is ready
  return splits.getChangeNumber() > -1;
}
