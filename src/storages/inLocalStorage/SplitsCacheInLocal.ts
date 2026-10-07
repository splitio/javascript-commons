import { ISplit } from '../../dtos/types';
import { AbstractSplitsCacheSync, usesSegments } from '../AbstractSplitsCacheSync';
import { isFiniteNumber, toNumber, isNaNNumber } from '../../utils/lang';
import { KeyBuilderCS } from '../KeyBuilderCS';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';
import { ISettings } from '../../types';
import { setToArray } from '../../utils/lang/sets';
import { StorageAdapter } from '../types';

/**
 * Changes accumulated in memory while applying an update, so that each flag set and counter delta is written once at the end of the update.
 */
interface UpdateBatch {
  flagSets: Map<string, Set<string>>;
  counts: Map<string, number>;
}

function newBatch(): UpdateBatch {
  return { flagSets: new Map(), counts: new Map() };
}

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

  private updateCount(batch: UpdateBatch, key: string, diff: number) {
    batch.counts.set(key, (batch.counts.get(key) || 0) + diff);
  }

  private updateCounts(split: ISplit, batch: UpdateBatch, diff: number) {
    this.updateCount(batch, this.keys.buildTrafficTypeKey(split.trafficTypeName), diff);
    if (usesSegments(split)) this.updateCount(batch, this.keys.buildSplitsWithSegmentCountKey(), diff);
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

  /**
   * Overrides the default implementation to batch the flag set and counter writes: each flag set and each counter is read from
   * storage once, updated in memory, and written once at the end, instead of once per feature flag.
   * `update` is synchronous, so no other reader can observe the intermediate state.
   */
  update(toAdd: ISplit[], toRemove: ISplit[], changeNumber: number): boolean {
    const batch = newBatch();
    let updated;
    try {
      updated = toAdd.map(addedFF => this.addSplitToBatch(addedFF, batch)).some(result => result);
      updated = toRemove.map(removedFF => this.removeSplitFromBatch(removedFF.name, batch)).some(result => result) || updated;
    } finally {
      this.flushBatch(batch);
    }
    this.setChangeNumber(changeNumber);
    return updated;
  }

  addSplit(split: ISplit) {
    const batch = newBatch();
    try {
      return this.addSplitToBatch(split, batch);
    } finally {
      this.flushBatch(batch);
    }
  }

  removeSplit(name: string): boolean {
    const batch = newBatch();
    try {
      return this.removeSplitFromBatch(name, batch);
    } finally {
      this.flushBatch(batch);
    }
  }

  private addSplitToBatch(split: ISplit, batch: UpdateBatch) {
    const name = split.name;
    const splitKey = this.keys.buildSplitKey(name);
    const splitFromStorage = this.storage.getItem(splitKey);
    const previousSplit = splitFromStorage ? JSON.parse(splitFromStorage) : null;

    if (previousSplit) {
      this.updateCounts(previousSplit, batch, -1);
      this.removeFromFlagSets(previousSplit.name, previousSplit.sets, batch);
    }

    this.storage.setItem(splitKey, JSON.stringify(split));

    this.updateCounts(split, batch, 1);
    this.addToFlagSets(split, batch);

    return true;
  }

  private removeSplitFromBatch(name: string, batch: UpdateBatch): boolean {
    const split = this.getSplit(name);
    if (!split) return false;

    this.storage.removeItem(this.keys.buildSplitKey(name));

    this.updateCounts(split, batch, -1);
    this.removeFromFlagSets(split.name, split.sets, batch);

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

  private addToFlagSets(featureFlag: ISplit, batch: UpdateBatch) {
    if (!featureFlag.sets) return;

    featureFlag.sets.forEach(featureFlagSet => {

      if (this.flagSetsFilter.length > 0 && !this.flagSetsFilter.some(filterFlagSet => filterFlagSet === featureFlagSet)) return;

      const flagSetKey = this.keys.buildFlagSetKey(featureFlagSet);

      this.getFlagSetFromBatch(flagSetKey, batch).add(featureFlag.name);
    });
  }

  private removeFromFlagSets(featureFlagName: string, flagSets: string[] | null | undefined, batch: UpdateBatch) {
    if (!flagSets) return;

    flagSets.forEach(flagSet => {
      this.removeNames(flagSet, featureFlagName, batch);
    });
  }

  private removeNames(flagSetName: string, featureFlagName: string, batch: UpdateBatch) {
    const flagSetKey = this.keys.buildFlagSetKey(flagSetName);

    // nothing to remove from a flag set that is neither in storage nor in the batch
    if (!batch.flagSets.has(flagSetKey) && !this.storage.getItem(flagSetKey)) return;

    this.getFlagSetFromBatch(flagSetKey, batch).delete(featureFlagName);
  }

  /**
   * Returns the flag names of the given flag set, reading from storage only the first time
   */
  private getFlagSetFromBatch(flagSetKey: string, batch: UpdateBatch): Set<string> {
    let flagSetCache = batch.flagSets.get(flagSetKey);
    if (!flagSetCache) {
      const flagSetFromStorage = this.storage.getItem(flagSetKey);
      flagSetCache = new Set(flagSetFromStorage ? JSON.parse(flagSetFromStorage) : []);
      batch.flagSets.set(flagSetKey, flagSetCache);
    }
    return flagSetCache;
  }

  private flushBatch(batch: UpdateBatch) {
    // flush counts
    batch.counts.forEach((diff, key) => {
      try {
        if (diff === 0) return;
        const count = toNumber(this.storage.getItem(key)) + diff;
        if (count > 0) this.storage.setItem(key, count + '');
        else this.storage.removeItem(key);
      } catch (e) {
        this.log.error(LOG_PREFIX + e);
      }
    });

    // flush flag sets
    batch.flagSets.forEach((flagSetCache, flagSetKey) => {
      try {
        if (flagSetCache.size === 0) this.storage.removeItem(flagSetKey);
        else this.storage.setItem(flagSetKey, JSON.stringify(setToArray(flagSetCache)));
      } catch (e) {
        this.log.error(LOG_PREFIX + e);
      }
    });
  }

}
