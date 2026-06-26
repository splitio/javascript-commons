import { IDefinition } from '../../dtos/types';
import { AbstractDefinitionsCacheSync, usesSegments } from '../AbstractDefinitionsCacheSync';
import { isFiniteNumber, toNumber, isNaNNumber } from '../../utils/lang';
import { KeyBuilderCS } from '../KeyBuilderCS';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';
import { ISettings } from '../../types';
import { setToArray } from '../../utils/lang/sets';
import { StorageAdapter } from '../types';

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

  private _decrementCount(key: string) {
    const count = toNumber(this.storage.getItem(key)) - 1;
    if (count > 0) this.storage.setItem(key, count + '');
    else this.storage.removeItem(key);
  }

  private _decrementCounts(definition: IDefinition) {
    try {
      const ttKey = this.keys.buildTrafficTypeKey(definition.trafficTypeName);
      this._decrementCount(ttKey);

      if (usesSegments(definition)) {
        const segmentsCountKey = this.keys.buildDefinitionsWithSegmentCountKey();
        this._decrementCount(segmentsCountKey);
      }
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
    }
  }

  private _incrementCounts(definition: IDefinition) {
    try {
      const ttKey = this.keys.buildTrafficTypeKey(definition.trafficTypeName);
      this.storage.setItem(ttKey, (toNumber(this.storage.getItem(ttKey)) + 1) + '');

      if (usesSegments(definition)) {
        const segmentsCountKey = this.keys.buildDefinitionsWithSegmentCountKey();
        this.storage.setItem(segmentsCountKey, (toNumber(this.storage.getItem(segmentsCountKey)) + 1) + '');
      }
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
    }
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

  add(definition: IDefinition) {
    const name = definition.name;
    const definitionKey = this.keys.buildDefinitionKey(name);
    const definitionFromStorage = this.storage.getItem(definitionKey);
    const previousDefinition = definitionFromStorage ? JSON.parse(definitionFromStorage) : null;

    if (previousDefinition) {
      this._decrementCounts(previousDefinition);
      this.removeFromSets(previousDefinition.name, previousDefinition.sets);
    }

    this.storage.setItem(definitionKey, JSON.stringify(definition));

    this._incrementCounts(definition);
    this.addToSets(definition);

    return true;
  }

  remove(name: string): boolean {
    const definition = this.get(name);
    if (!definition) return false;

    this.storage.removeItem(this.keys.buildDefinitionKey(name));

    this._decrementCounts(definition);
    this.removeFromSets(definition.name, definition.sets);

    return true;
  }

  get(name: string): IDefinition | null {
    const item = this.storage.getItem(this.keys.buildDefinitionKey(name));
    return item && JSON.parse(item);
  }

  setChangeNumber(changeNumber: number): boolean {
    try {
      this.storage.setItem(this.keys.buildDefinitionsTillKey(), changeNumber + '');
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

  private addToSets(definition: IDefinition) {
    if (!definition.sets) return;

    definition.sets.forEach(set => {

      if (this.setsFilter.length > 0 && !this.setsFilter.some(filterSet => filterSet === set)) return;

      const setKey = this.keys.buildSetKey(set);

      const setFromStorage = this.storage.getItem(setKey);

      const setCache = new Set(setFromStorage ? JSON.parse(setFromStorage) : []);

      if (setCache.has(definition.name)) return;

      setCache.add(definition.name);

      this.storage.setItem(setKey, JSON.stringify(setToArray(setCache)));
    });
  }

  private removeFromSets(definitionName: string, sets?: string[] | null) {
    if (!sets) return;

    sets.forEach(set => {
      this.removeNames(set, definitionName);
    });
  }

  private removeNames(setName: string, definitionName: string) {
    const setKey = this.keys.buildSetKey(setName);

    const setFromStorage = this.storage.getItem(setKey);

    if (!setFromStorage) return;

    const setCache = new Set(JSON.parse(setFromStorage));
    setCache.delete(definitionName);

    if (setCache.size === 0) {
      this.storage.removeItem(setKey);
      return;
    }

    this.storage.setItem(setKey, JSON.stringify(setToArray(setCache)));
  }

}
