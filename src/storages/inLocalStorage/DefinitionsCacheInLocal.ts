import { IDefinition } from '../../dtos/types';
import { AbstractDefinitionsCacheSync, usesSegments } from '../AbstractDefinitionsCacheSync';
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
  sets: Map<string, Set<string>>;
  counts: Map<string, number>;
}

function newBatch(): UpdateBatch {
  return { sets: new Map(), counts: new Map() };
}

export class DefinitionsCacheInLocal extends AbstractDefinitionsCacheSync {

  private readonly keys: KeyBuilderCS;
  private readonly log: ILogger;
  private readonly setsFilter: string[];
  private hasSync?: boolean;
  private readonly storage: StorageAdapter;

  constructor(settings: ISettings, keys: KeyBuilderCS, storage: StorageAdapter) {
    super();
    this.keys = keys;
    this.log = settings.log;
    this.setsFilter = settings.sync.__splitFiltersValidation.groupedFilters.bySet;
    this.storage = storage;
  }

  private updateCount(batch: UpdateBatch, key: string, diff: number) {
    batch.counts.set(key, (batch.counts.get(key) || 0) + diff);
  }

  private updateCounts(definition: IDefinition, batch: UpdateBatch, diff: number) {
    this.updateCount(batch, this.keys.buildTrafficTypeKey(definition.trafficTypeName), diff);
    if (usesSegments(definition)) this.updateCount(batch, this.keys.buildDefinitionsWithSegmentCountKey(), diff);
  }

  /**
   * Removes all definitions related data from localStorage (splits, counters, changeNumber and lastUpdated).
   * We cannot simply call `localStorage.clear()` since that implies removing user items from the storage.
   */
  clear() {
    // collect item keys
    const len = this.storage.length;
    const accum = [];
    for (let cur = 0; cur < len; cur++) {
      const key = this.storage.key(cur);
      if (key != null && this.keys.isDefinitionsCacheKey(key)) accum.push(key);
    }
    // remove items
    accum.forEach(key => {
      this.storage.removeItem(key);
    });

    this.hasSync = false;
  }

  /**
   * Overrides the default implementation to batch sets and counters writes: each item is read from
   * storage once, updated in memory, and written once at the end, instead of once per definition.
   * `update` is synchronous, so no other reader can observe the intermediate state.
   */
  update(toAdd: IDefinition[], toRemove: string[], changeNumber?: number): string[] {
    const batch = newBatch();
    let updated: string[] = [];
    try {
      updated = toRemove.filter(removedFF => this.removeFromBatch(removedFF, batch))
        .concat(toAdd.filter(addedFF => this.addToBatch(addedFF, batch)).map(addedFF => addedFF.name));
    } finally {
      this.flushBatch(batch);
    }
    this.setChangeNumber(changeNumber);
    return updated;
  }

  add(definition: IDefinition) {
    const batch = newBatch();
    try {
      return this.addToBatch(definition, batch);
    } finally {
      this.flushBatch(batch);
    }
  }

  remove(name: string): boolean {
    const batch = newBatch();
    try {
      return this.removeFromBatch(name, batch);
    } finally {
      this.flushBatch(batch);
    }
  }

  private addToBatch(definition: IDefinition, batch: UpdateBatch) {
    const name = definition.name;
    const definitionKey = this.keys.buildDefinitionKey(name);
    const definitionFromStorage = this.storage.getItem(definitionKey);
    const previousDefinition = definitionFromStorage ? JSON.parse(definitionFromStorage) : null;

    if (previousDefinition) {
      if (previousDefinition.changeNumber >= definition.changeNumber) return false;
      this.updateCounts(previousDefinition, batch, -1);
      this.removeFromSets(previousDefinition.name, previousDefinition.sets, batch);
    }

    this.storage.setItem(definitionKey, JSON.stringify(definition));

    this.updateCounts(definition, batch, 1);
    this.addToSets(definition, batch);

    return true;
  }

  private removeFromBatch(name: string, batch: UpdateBatch): boolean {
    const definition = this.get(name);
    if (!definition) return false;

    this.storage.removeItem(this.keys.buildDefinitionKey(name));

    this.updateCounts(definition, batch, -1);
    this.removeFromSets(definition.name, definition.sets, batch);

    return true;
  }

  get(name: string): IDefinition | null {
    const item = this.storage.getItem(this.keys.buildDefinitionKey(name));
    return item && JSON.parse(item);
  }

  setChangeNumber(changeNumber?: number): boolean {
    try {
      if (changeNumber !== undefined) this.storage.setItem(this.keys.buildDefinitionsTillKey(), changeNumber + '');
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
    let value: string | number | null = this.storage.getItem(this.keys.buildDefinitionsTillKey());

    if (value !== null) {
      value = parseInt(value, 10);

      return isNaNNumber(value) ? n : value;
    }

    return n;
  }

  getNames(): string[] {
    const len = this.storage.length;
    const accum = [];

    let cur = 0;

    while (cur < len) {
      const key = this.storage.key(cur);

      if (key != null && this.keys.isDefinitionKey(key)) accum.push(this.keys.extractKey(key));

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

    const storedCount = this.storage.getItem(this.keys.buildDefinitionsWithSegmentCountKey());
    const definitionsWithSegmentsCount = storedCount === null ? 0 : toNumber(storedCount);

    return isFiniteNumber(definitionsWithSegmentsCount) ?
      definitionsWithSegmentsCount > 0 :
      true;
  }

  getNamesBySets(sets: string[]): Set<string>[] {
    return sets.map(set => {
      const setKey = this.keys.buildSetKey(set);
      const setFromStorage = this.storage.getItem(setKey);

      return new Set(setFromStorage ? JSON.parse(setFromStorage) : []);
    });
  }

  private addToSets(definition: IDefinition, batch: UpdateBatch) {
    if (!definition.sets) return;

    definition.sets.forEach(set => {

      if (this.setsFilter.length > 0 && !this.setsFilter.some(filterSet => filterSet === set)) return;

      const setKey = this.keys.buildSetKey(set);

      this.getSetFromBatch(setKey, batch).add(definition.name);
    });
  }

  private removeFromSets(definitionName: string, sets: string[] | null | undefined, batch: UpdateBatch) {
    if (!sets) return;

    sets.forEach(set => {
      this.removeNames(set, definitionName, batch);
    });
  }

  private removeNames(setName: string, definitionName: string, batch: UpdateBatch) {
    const setKey = this.keys.buildSetKey(setName);

    // nothing to remove from a flag set that is neither in storage nor in the batch
    if (!batch.sets.has(setKey) && !this.storage.getItem(setKey)) return;

    this.getSetFromBatch(setKey, batch).delete(definitionName);
  }

  /**
   * Returns the flag names of the given flag set, reading from storage only the first time
   */
  private getSetFromBatch(setKey: string, batch: UpdateBatch): Set<string> {
    let setCache = batch.sets.get(setKey);
    if (!setCache) {
      const setFromStorage = this.storage.getItem(setKey);
      setCache = new Set(setFromStorage ? JSON.parse(setFromStorage) : []);
      batch.sets.set(setKey, setCache);
    }
    return setCache;
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
    batch.sets.forEach((setCache, setKey) => {
      try {
        if (setCache.size === 0) this.storage.removeItem(setKey);
        else this.storage.setItem(setKey, JSON.stringify(setToArray(setCache)));
      } catch (e) {
        this.log.error(LOG_PREFIX + e);
      }
    });
  }

}
