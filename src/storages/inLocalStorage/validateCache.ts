import { ISettings } from '../../types';
import { DEFAULT_CACHE_EXPIRATION_IN_MILLIS } from '../../utils/constants/browser';
import { isNaNNumber } from '../../utils/lang';
import { getStorageHash } from '../KeyBuilder';
import { LOG_PREFIX } from './constants';
import type { SplitsCacheInLocal } from './SplitsCacheInLocal';
import { KeyBuilderCS } from '../KeyBuilderCS';

/**
 * Clean cache if:
 * - it has expired, i.e., its `lastUpdated` timestamp is older than the given `expirationTimestamp`
 * - hash has changed, i.e., the SDK key, flags filter criteria or flags spec version was modified
 */
export function validateCache(settings: ISettings, keys: KeyBuilderCS, splits: SplitsCacheInLocal): boolean {
  const { log } = settings;

  // Check expiration and clear cache if needed
  const expirationTimestamp = Date.now() - DEFAULT_CACHE_EXPIRATION_IN_MILLIS;
  let value: string | number | null = localStorage.getItem(keys.buildLastUpdatedKey());
  if (value !== null) {
    value = parseInt(value, 10);
    if (!isNaNNumber(value) && value < expirationTimestamp) splits.clear();
  }

  // Check hash and clear cache if needed
  const storageHashKey = keys.buildHashKey();
  const storageHash = localStorage.getItem(storageHashKey);
  const currentStorageHash = getStorageHash(settings);

  if (storageHash !== currentStorageHash) {
    log.info(LOG_PREFIX + 'SDK key, flags filter criteria or flags spec version was modified. Updating cache');
    try {
      if (splits.getChangeNumber() > -1) splits.clear();

      localStorage.setItem(storageHashKey, currentStorageHash);
    } catch (e) {
      log.error(LOG_PREFIX + e);
    }
  }

  // Check if the cache is ready
  return splits.getChangeNumber() > -1;
}
