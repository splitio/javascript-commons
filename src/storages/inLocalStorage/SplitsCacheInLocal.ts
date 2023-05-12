import { ISplit, ISplitFiltersValidation } from '../../dtos/types';
import { AbstractSplitsCacheSync, usesSegments } from '../AbstractSplitsCacheSync';
import { isFiniteNumber, toNumber, isNaNNumber } from '../../utils/lang';
import { KeyBuilderCS } from '../KeyBuilderCS';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';

/**
 * ISplitsCacheSync implementation that stores split definitions in browser LocalStorage.
 */
export class SplitsCacheInLocal extends AbstractSplitsCacheSync {

  private readonly keys: KeyBuilderCS;
  private readonly splitFiltersValidation: ISplitFiltersValidation;
  private hasSync?: boolean;
  private cacheReadyButNeedsToFlush: boolean = false;
  private updateNewFilter?: boolean;

  /**
   * @param {KeyBuilderCS} keys
   * @param {number | undefined} expirationTimestamp
   * @param {ISplitFiltersValidation} splitFiltersValidation
   */
  constructor(private readonly log: ILogger, keys: KeyBuilderCS, expirationTimestamp?: number, splitFiltersValidation: ISplitFiltersValidation = { queryString: null, groupedFilters: { byName: [], byPrefix: [] }, validFilters: [] }) {
    super();
    this.keys = keys;
    this.splitFiltersValidation = splitFiltersValidation;

    this._checkExpiration(expirationTimestamp);

    this._checkFilterQuery();
  }

  private _decrementCount(key: string) {
    const count = toNumber(localStorage.getItem(key)) - 1;
    // @ts-expect-error
    if (count > 0) localStorage.setItem(key, count);
    else localStorage.removeItem(key);
  }

  private _decrementCounts(split: ISplit | null) {
    try {
      if (split) {
        const ttKey = this.keys.buildTrafficTypeKey(split.trafficTypeName);
        this._decrementCount(ttKey);

        if (usesSegments(split)) {
          const segmentsCountKey = this.keys.buildSplitsWithSegmentCountKey();
          this._decrementCount(segmentsCountKey);
        }
      }
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
    }
  }

  private _incrementCounts(split: ISplit) {
    try {
      if (split) {
        const ttKey = this.keys.buildTrafficTypeKey(split.trafficTypeName);
        // @ts-expect-error
        localStorage.setItem(ttKey, toNumber(localStorage.getItem(ttKey)) + 1);

        if (usesSegments(split)) {
          const segmentsCountKey = this.keys.buildSplitsWithSegmentCountKey();
          // @ts-expect-error
          localStorage.setItem(segmentsCountKey, toNumber(localStorage.getItem(segmentsCountKey)) + 1);
        }
      }
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
    }
  }


  /**
   * Removes all splits cache related data from localStorage (splits, counters, changeNumber and lastUpdated).
   * We cannot simply call `localStorage.clear()` since that implies removing user items from the storage.
   */
  clear() {
    this.log.info(LOG_PREFIX + 'Flushing Splits data from localStorage');

    // collect item keys
    const len = localStorage.length;
    const accum = [];
    for (let cur = 0; cur < len; cur++) {
      const key = localStorage.key(cur);
      if (key != null && this.keys.isSplitsCacheKey(key)) accum.push(key);
    }
    // remove items
    accum.forEach(key => {
      localStorage.removeItem(key);
    });

    this.hasSync = false;
  }

  addSplit(name: string, split: ISplit) {
    try {
      const splitKey = this.keys.buildSplitKey(name);
      const splitFromLocalStorage = localStorage.getItem(splitKey);
      const previousSplit = splitFromLocalStorage ? JSON.parse(splitFromLocalStorage) : null;

      localStorage.setItem(splitKey, JSON.stringify(split));

      this._incrementCounts(split);
      this._decrementCounts(previousSplit);

      return true;
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
      return false;
    }
  }

  removeSplit(name: string): boolean {
    try {
      const split = this.getSplit(name);
      localStorage.removeItem(this.keys.buildSplitKey(name));

      this._decrementCounts(split);

      return true;
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
      return false;
    }
  }

  getSplit(name: string) {
    const item = localStorage.getItem(this.keys.buildSplitKey(name));
    return item && JSON.parse(item);
  }

  setChangeNumber(changeNumber: number): boolean {
    // when cache is ready but using a new split query, we must clear all split data
    if (this.cacheReadyButNeedsToFlush) {
      this.clear();
      this.cacheReadyButNeedsToFlush = false;
    }

    // when using a new split query, we must update it at the store
    if (this.updateNewFilter) {
      this.log.info(LOG_PREFIX + 'Split filter query was modified. Updating cache.');
      const queryKey = this.keys.buildSplitsFilterQueryKey();
      const queryString = this.splitFiltersValidation.queryString;
      try {
        if (queryString) localStorage.setItem(queryKey, queryString);
        else localStorage.removeItem(queryKey);
      } catch (e) {
        this.log.error(LOG_PREFIX + e);
      }
      this.updateNewFilter = false;
    }

    try {
      localStorage.setItem(this.keys.buildSplitsTillKey(), changeNumber + '');
      // update "last updated" timestamp with current time
      localStorage.setItem(this.keys.buildLastUpdatedKey(), Date.now() + '');
      this.hasSync = true;
      return true;
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
      return false;
    }
  }

  getChangeNumber(): number {
    const n = -1;
    let value: string | number | null = localStorage.getItem(this.keys.buildSplitsTillKey());

    if (value !== null) {
      value = parseInt(value, 10);

      return isNaNNumber(value) ? n : value;
    }

    return n;
  }

  getSplitNames(): string[] {
    const len = localStorage.length;
    const accum = [];

    let cur = 0;

    while (cur < len) {
      const key = localStorage.key(cur);

      if (key != null && this.keys.isSplitKey(key)) accum.push(this.keys.extractKey(key));

      cur++;
    }

    return accum;
  }

  trafficTypeExists(trafficType: string): boolean {
    const ttCount = toNumber(localStorage.getItem(this.keys.buildTrafficTypeKey(trafficType)));
    return isFiniteNumber(ttCount) && ttCount > 0;
  }

  usesSegments() {
    // If cache hasn't been synchronized with the cloud, assume we need them.
    if (!this.hasSync) return true;

    const storedCount = localStorage.getItem(this.keys.buildSplitsWithSegmentCountKey());
    const splitsWithSegmentsCount = storedCount === null ? 0 : toNumber(storedCount);

    if (isFiniteNumber(splitsWithSegmentsCount)) {
      return splitsWithSegmentsCount > 0;
    } else {
      return true;
    }
  }

  /**
   * Check if the splits information is already stored in browser LocalStorage.
   * In this function we could add more code to check if the data is valid.
   * @override
   */
  checkCache(): boolean {
    return this.getChangeNumber() > -1 || this.cacheReadyButNeedsToFlush;
  }

  /**
   * Clean Splits cache if its `lastUpdated` timestamp is older than the given `expirationTimestamp`,
   *
   * @param {number | undefined} expirationTimestamp if the value is not a number, data will not be cleaned
   */
  private _checkExpiration(expirationTimestamp?: number) {
    let value: string | number | null = localStorage.getItem(this.keys.buildLastUpdatedKey());
    if (value !== null) {
      value = parseInt(value, 10);
      if (!isNaNNumber(value) && expirationTimestamp && value < expirationTimestamp) this.clear();
    }
  }

  private _checkFilterQuery() {
    const { queryString, groupedFilters } = this.splitFiltersValidation;
    const queryKey = this.keys.buildSplitsFilterQueryKey();
    const currentQueryString = localStorage.getItem(queryKey);

    if (currentQueryString !== queryString) {
      try {
        // mark cache to update the new query filter on first successful splits fetch
        this.updateNewFilter = true;

        // if cache is ready:
        if (this.checkCache()) {
          // * set change number to -1, to fetch splits with -1 `since` value.
          localStorage.setItem(this.keys.buildSplitsTillKey(), '-1');

          // * remove from cache splits that doesn't match with the new filters
          this.getSplitNames().forEach((splitName) => {
            if (queryString && (
              // @TODO consider redefining `groupedFilters` to expose a method like `groupedFilters::filter(splitName): boolean`
              groupedFilters.byName.indexOf(splitName) > -1 ||
              groupedFilters.byPrefix.some((prefix: string) => splitName.startsWith(prefix + '__'))
            )) {
              // * set `cacheReadyButNeedsToFlush` so that `checkCache` returns true (the storage is ready to be used) and the data is cleared before updating on first successful splits fetch
              this.cacheReadyButNeedsToFlush = true;
              return;
            }
            this.removeSplit(splitName);
          });
        }
      } catch (e) {
        this.log.error(LOG_PREFIX + e);
      }
    }
    // if the filter didn't change, nothing is done
  }
}
