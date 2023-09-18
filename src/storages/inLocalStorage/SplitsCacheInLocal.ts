import { ISplit, ISplitFiltersValidation } from '../../dtos/types';
import { AbstractSplitsCacheSync, usesSegments } from '../AbstractSplitsCacheSync';
import { isFiniteNumber, toNumber, isNaNNumber } from '../../utils/lang';
import { KeyBuilderCS } from '../KeyBuilderCS';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';
import { ISet, _Set, returnSetsUnion, setToArray } from '../../utils/lang/sets';

/**
 * ISplitsCacheSync implementation that stores split definitions in browser LocalStorage.
 */
export class SplitsCacheInLocal extends AbstractSplitsCacheSync {

  private readonly keys: KeyBuilderCS;
  private readonly splitFiltersValidation: ISplitFiltersValidation;
  private readonly flagsetsFilter: string[];
  private hasSync?: boolean;
  private updateNewFilter?: boolean;

  /**
   * @param {KeyBuilderCS} keys
   * @param {number | undefined} expirationTimestamp
   * @param {ISplitFiltersValidation} splitFiltersValidation
   */
  constructor(private readonly log: ILogger, keys: KeyBuilderCS, expirationTimestamp?: number, splitFiltersValidation: ISplitFiltersValidation = { queryString: null, groupedFilters: { bySet: [], byName: [], byPrefix: [] }, validFilters: [] }) {
    super();
    this.keys = keys;
    this.splitFiltersValidation = splitFiltersValidation;
    this.flagsetsFilter = this.splitFiltersValidation.groupedFilters.bySet;

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

      if (previousSplit) this.removeFromFlagsets(previousSplit.name, previousSplit.sets);
      this.addToFlagsets(split);

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
      if (split) this.removeFromFlagsets(split.name, split.sets);

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
    return this.getChangeNumber() > -1;
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
    const { queryString } = this.splitFiltersValidation;
    const queryKey = this.keys.buildSplitsFilterQueryKey();
    const currentQueryString = localStorage.getItem(queryKey);

    if (currentQueryString !== queryString) {
      try {
        // mark cache to update the new query filter on first successful splits fetch
        this.updateNewFilter = true;

        // if there is cache, clear it
        if (this.checkCache()) this.clear();

      } catch (e) {
        this.log.error(LOG_PREFIX + e);
      }
    }
    // if the filter didn't change, nothing is done
  }

  getNamesByFlagsets(flagsets: string[]): ISet<string>{
    let toReturn: ISet<string> = new _Set([]);
    flagsets.forEach(flagset => {
      const flagsetKey = this.keys.buildFlagsetKey(flagset);
      let flagsetFromLocalStorage = localStorage.getItem(flagsetKey);

      if (flagsetFromLocalStorage) {
        const flagsetCache = new _Set(JSON.parse(flagsetFromLocalStorage));
        toReturn = returnSetsUnion(toReturn, flagsetCache);
      }
    });
    return toReturn;

  }

  addToFlagsets(featureFlag: ISplit) {
    if (!featureFlag.sets) return;

    featureFlag.sets.forEach(featureFlagset => {

      if (this.flagsetsFilter.length > 0 && !this.flagsetsFilter.some(filterFlagset => filterFlagset === featureFlagset)) return;

      const flagsetKey = this.keys.buildFlagsetKey(featureFlagset);

      let flagsetFromLocalStorage = localStorage.getItem(flagsetKey);
      if (!flagsetFromLocalStorage) flagsetFromLocalStorage = '[]';

      const flagsetCache = new _Set(JSON.parse(flagsetFromLocalStorage));
      flagsetCache.add(featureFlag.name);

      localStorage.setItem(flagsetKey, JSON.stringify(setToArray(flagsetCache)));
    });
  }

  private removeFromFlagsets(featureFlagName: string, flagsets?: string[]) {
    if (!flagsets) return;

    flagsets.forEach(flagset => {
      this.removeNames(flagset, featureFlagName);
    });
  }

  private removeNames(flagsetName: string, featureFlagName: string) {
    const flagsetKey = this.keys.buildFlagsetKey(flagsetName);

    let flagsetFromLocalStorage = localStorage.getItem(flagsetKey);

    if (!flagsetFromLocalStorage) return;

    const flagsetCache = new _Set(JSON.parse(flagsetFromLocalStorage));
    flagsetCache.delete(featureFlagName);

    if (flagsetCache.size === 0) {
      localStorage.removeItem(flagsetKey);
      return;
    }

    localStorage.setItem(flagsetKey, JSON.stringify(setToArray(flagsetCache)));
  }

}
