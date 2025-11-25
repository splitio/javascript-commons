import { ISplit } from '../../dtos/types';
import { AbstractSplitsCacheSync, usesSegments } from '../AbstractSplitsCacheSync';
import { isFiniteNumber, toNumber, isNaNNumber } from '../../utils/lang';
import { KeyBuilderCS } from '../KeyBuilderCS';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';
import { ISettings } from '../../types';
import { setToArray } from '../../utils/lang/sets';
import { StorageAdapter } from '../types';

export class SplitsCacheInLocal extends AbstractSplitsCacheSync {

  private readonly keys: KeyBuilderCS;
  private readonly log: ILogger;
  private readonly flagSetsFilter: string[];
  private hasSync?: boolean;
  private readonly storage: StorageAdapter;

  constructor(settings: ISettings, keys: KeyBuilderCS, storage: StorageAdapter) {
    super();
    this.keys = keys;
    this.log = settings.log;
    this.flagSetsFilter = settings.sync.__splitFiltersValidation.groupedFilters.bySet;
    this.storage = storage;
  }

  private _decrementCount(key: string) {
    const count = toNumber(this.storage.getItem(key)) - 1;
    if (count > 0) this.storage.setItem(key, count + '');
    else this.storage.removeItem(key);
  }

  private _decrementCounts(split: ISplit) {
    try {
      const ttKey = this.keys.buildTrafficTypeKey(split.trafficTypeName);
      this._decrementCount(ttKey);

      if (usesSegments(split)) {
        const segmentsCountKey = this.keys.buildSplitsWithSegmentCountKey();
        this._decrementCount(segmentsCountKey);
      }
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
    }
  }

  private _incrementCounts(split: ISplit) {
    try {
      const ttKey = this.keys.buildTrafficTypeKey(split.trafficTypeName);
      this.storage.setItem(ttKey, (toNumber(this.storage.getItem(ttKey)) + 1) + '');

      if (usesSegments(split)) {
        const segmentsCountKey = this.keys.buildSplitsWithSegmentCountKey();
        this.storage.setItem(segmentsCountKey, (toNumber(this.storage.getItem(segmentsCountKey)) + 1) + '');
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
    // collect item keys
    const len = this.storage.length;
    const accum = [];
    for (let cur = 0; cur < len; cur++) {
      const key = this.storage.key(cur);
      if (key != null && this.keys.isSplitsCacheKey(key)) accum.push(key);
    }
    // remove items
    accum.forEach(key => {
      this.storage.removeItem(key);
    });

    this.hasSync = false;
  }

  addSplit(split: ISplit) {
    const name = split.name;
    const splitKey = this.keys.buildSplitKey(name);
    const splitFromStorage = this.storage.getItem(splitKey);
    const previousSplit = splitFromStorage ? JSON.parse(splitFromStorage) : null;

    if (previousSplit) {
      this._decrementCounts(previousSplit);
      this.removeFromFlagSets(previousSplit.name, previousSplit.sets);
    }

    this.storage.setItem(splitKey, JSON.stringify(split));

    this._incrementCounts(split);
    this.addToFlagSets(split);

    return true;
  }

  removeSplit(name: string): boolean {
    const split = this.getSplit(name);
    if (!split) return false;

    this.storage.removeItem(this.keys.buildSplitKey(name));

    this._decrementCounts(split);
    this.removeFromFlagSets(split.name, split.sets);

    return true;
  }

  getSplit(name: string): ISplit | null {
    const item = this.storage.getItem(this.keys.buildSplitKey(name));
    return item && JSON.parse(item);
  }

  setChangeNumber(changeNumber: number): boolean {
    try {
      this.storage.setItem(this.keys.buildSplitsTillKey(), changeNumber + '');
      // update "last updated" timestamp with current time
      this.storage.setItem(this.keys.buildLastUpdatedKey(), Date.now() + '');
      this.hasSync = true;
      return true;
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
      return false;
    }
  }

  getChangeNumber(): number {
    const n = -1;
    let value: string | number | null = this.storage.getItem(this.keys.buildSplitsTillKey());

    if (value !== null) {
      value = parseInt(value, 10);

      return isNaNNumber(value) ? n : value;
    }

    return n;
  }

  getSplitNames(): string[] {
    const len = this.storage.length;
    const accum = [];

    let cur = 0;

    while (cur < len) {
      const key = this.storage.key(cur);

      if (key != null && this.keys.isSplitKey(key)) accum.push(this.keys.extractKey(key));

      cur++;
    }

    return accum;
  }

  trafficTypeExists(trafficType: string): boolean {
    const ttCount = toNumber(this.storage.getItem(this.keys.buildTrafficTypeKey(trafficType)));
    return isFiniteNumber(ttCount) && ttCount > 0;
  }

  usesSegments() {
    // If cache hasn't been synchronized with the cloud, assume we need them.
    if (!this.hasSync) return true;

    const storedCount = this.storage.getItem(this.keys.buildSplitsWithSegmentCountKey());
    const splitsWithSegmentsCount = storedCount === null ? 0 : toNumber(storedCount);

    return isFiniteNumber(splitsWithSegmentsCount) ?
      splitsWithSegmentsCount > 0 :
      true;
  }

  getNamesByFlagSets(flagSets: string[]): Set<string>[] {
    return flagSets.map(flagSet => {
      const flagSetKey = this.keys.buildFlagSetKey(flagSet);
      const flagSetFromStorage = this.storage.getItem(flagSetKey);

      return new Set(flagSetFromStorage ? JSON.parse(flagSetFromStorage) : []);
    });
  }

  private addToFlagSets(featureFlag: ISplit) {
    if (!featureFlag.sets) return;

    featureFlag.sets.forEach(featureFlagSet => {

      if (this.flagSetsFilter.length > 0 && !this.flagSetsFilter.some(filterFlagSet => filterFlagSet === featureFlagSet)) return;

      const flagSetKey = this.keys.buildFlagSetKey(featureFlagSet);

      const flagSetFromStorage = this.storage.getItem(flagSetKey);

      const flagSetCache = new Set(flagSetFromStorage ? JSON.parse(flagSetFromStorage) : []);

      if (flagSetCache.has(featureFlag.name)) return;

      flagSetCache.add(featureFlag.name);

      this.storage.setItem(flagSetKey, JSON.stringify(setToArray(flagSetCache)));
    });
  }

  private removeFromFlagSets(featureFlagName: string, flagSets?: string[]) {
    if (!flagSets) return;

    flagSets.forEach(flagSet => {
      this.removeNames(flagSet, featureFlagName);
    });
  }

  private removeNames(flagSetName: string, featureFlagName: string) {
    const flagSetKey = this.keys.buildFlagSetKey(flagSetName);

    const flagSetFromStorage = this.storage.getItem(flagSetKey);

    if (!flagSetFromStorage) return;

    const flagSetCache = new Set(JSON.parse(flagSetFromStorage));
    flagSetCache.delete(featureFlagName);

    if (flagSetCache.size === 0) {
      this.storage.removeItem(flagSetKey);
      return;
    }

    this.storage.setItem(flagSetKey, JSON.stringify(setToArray(flagSetCache)));
  }

}
