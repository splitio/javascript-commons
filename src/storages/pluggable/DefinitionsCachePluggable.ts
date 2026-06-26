import { isFiniteNumber, isNaNNumber } from '../../utils/lang';
import { KeyBuilder } from '../KeyBuilder';
import { IPluggableStorageWrapper } from '../types';
import { ILogger } from '../../logger/types';
import { IDefinition, ISplitFiltersValidation } from '../../dtos/types';
import { LOG_PREFIX } from './constants';
import { AbstractDefinitionsCacheAsync } from '../AbstractDefinitionsCacheAsync';
import { returnDifference } from '../../utils/lang/sets';

/**
 * IDefinitionsCacheAsync implementation for pluggable storages.
 */
export class DefinitionsCachePluggable extends AbstractDefinitionsCacheAsync {

  private readonly log: ILogger;
  private readonly keys: KeyBuilder;
  private readonly wrapper: IPluggableStorageWrapper;
  private readonly setsFilter: string[];

  /**
   * Create a DefinitionsCache that uses a storage wrapper.
   * @param log -  Logger instance.
   * @param keys -  Key builder.
   * @param wrapper -  Adapted wrapper storage.
   */
  constructor(log: ILogger, keys: KeyBuilder, wrapper: IPluggableStorageWrapper, splitFiltersValidation?: ISplitFiltersValidation) {
    super();
    this.log = log;
    this.keys = keys;
    this.wrapper = wrapper;
    this.setsFilter = splitFiltersValidation ? splitFiltersValidation.groupedFilters.bySet : [];
  }

  private _decrementCounts(definition: IDefinition) {
    const ttKey = this.keys.buildTrafficTypeKey(definition.trafficTypeName);
    return this.wrapper.decr(ttKey).then(count => {
      if (count === 0) return this.wrapper.del(ttKey);
    });
  }

  private _incrementCounts(definition: IDefinition) {
    const ttKey = this.keys.buildTrafficTypeKey(definition.trafficTypeName);
    return this.wrapper.incr(ttKey);
  }

  private _updateSets(definitionName: string, setsOfRemovedDefinition?: string[] | null, setsOfAddedDefinition?: string[] | null) {
    const removeFromSets = returnDifference(setsOfRemovedDefinition, setsOfAddedDefinition);

    let addToSets = returnDifference(setsOfAddedDefinition, setsOfRemovedDefinition);
    if (this.setsFilter.length > 0) {
      addToSets = addToSets.filter(set => {
        return this.setsFilter.some(filterSet => filterSet === set);
      });
    }

    const items = [definitionName];

    return Promise.all([
      ...removeFromSets.map(setName => this.wrapper.removeItems(this.keys.buildSetKey(setName), items)),
      ...addToSets.map(setName => this.wrapper.addItems(this.keys.buildSetKey(setName), items))
    ]);
  }

  /**
   * Add a given definition.
   * The returned promise is resolved when the operation success
   * or rejected if it fails (e.g., wrapper operation fails)
   */
  add(definition: IDefinition): Promise<boolean> {
    const name = definition.name;
    const definitionKey = this.keys.buildDefinitionKey(name);
    return this.wrapper.get(definitionKey).then(definitionFromStorage => {

      // handling parsing error
      let parsedPreviousDefinition: IDefinition, stringifiedNewDefinition;
      try {
        parsedPreviousDefinition = definitionFromStorage ? JSON.parse(definitionFromStorage) : undefined;
        stringifiedNewDefinition = JSON.stringify(definition);
      } catch (e) {
        throw new Error('Error parsing feature flag definition: ' + e);
      }

      return this.wrapper.set(definitionKey, stringifiedNewDefinition).then(() => {
        // avoid unnecessary increment/decrement operations
        if (parsedPreviousDefinition && parsedPreviousDefinition.trafficTypeName === definition.trafficTypeName) return;

        // update traffic type counts
        return this._incrementCounts(definition).then(() => {
          if (parsedPreviousDefinition) return this._decrementCounts(parsedPreviousDefinition);
        });
      }).then(() => this._updateSets(name, parsedPreviousDefinition && parsedPreviousDefinition.sets, definition.sets));
    }).then(() => true);
  }

  /**
   * Remove a given definition.
   * The returned promise is resolved when the operation success, with a boolean indicating if the definition existed or not.
   * or rejected if it fails (e.g., wrapper operation fails).
   */
  remove(name: string) {
    return this.get(name).then((definition) => {
      if (definition) {
        return this._decrementCounts(definition).then(() => this._updateSets(name, definition.sets));
      }
    }).then(() => {
      return this.wrapper.del(this.keys.buildDefinitionKey(name));
    });
  }

  /**
   * Get definition.
   * The returned promise is resolved with the definition or null if it's not defined,
   * or rejected if wrapper operation fails.
   */
  get(name: string): Promise<IDefinition | null> {
    return this.wrapper.get(this.keys.buildDefinitionKey(name))
      .then(maybeDefinition => maybeDefinition && JSON.parse(maybeDefinition));
  }

  /**
   * Get list of definitions.
   * The returned promise is resolved with a map of names to their definition or null if it's not defined,
   * or rejected if wrapper operation fails.
   */
  getMany(names: string[]): Promise<Record<string, IDefinition | null>> {
    const keys = names.map(name => this.keys.buildDefinitionKey(name));

    return this.wrapper.getMany(keys).then(stringifiedDefinitions => {
      const definitions: Record<string, IDefinition | null> = {};
      names.forEach((name, idx) => {
        const definition = stringifiedDefinitions[idx];
        definitions[name] = definition && JSON.parse(definition);
      });
      return Promise.resolve(definitions);
    });
  }

  /**
   * Get list of all definitions.
   * The returned promise is resolved with the list of definitions,
   * or rejected if wrapper operation fails.
   */
  getAll(): Promise<IDefinition[]> {
    return this.wrapper.getKeysByPrefix(this.keys.buildDefinitionKeyPrefix())
      .then((listOfKeys) => this.wrapper.getMany(listOfKeys))
      .then((definitions) => definitions.map((definition) => {
        return JSON.parse(definition as string);
      }));
  }

  /**
   * Get list of definition names.
   * The returned promise is resolved with the list of names,
   * or rejected if wrapper operation fails.
   */
  getNames(): Promise<string[]> {
    return this.wrapper.getKeysByPrefix(this.keys.buildDefinitionKeyPrefix()).then(
      (listOfKeys) => listOfKeys.map(this.keys.extractKey)
    );
  }

  /**
   * Get list of definition names related to a given list of set names.
   * The returned promise is resolved with the list of names per set.
   * It never rejects (If there is a wrapper error for some set, an empty set is returned for it).
   */
  getNamesBySets(sets: string[]): Promise<Set<string>[]> {
    return Promise.all(sets.map(set => {
      const setKey = this.keys.buildSetKey(set);
      return this.wrapper.getItems(setKey).catch(() => []);
    })).then(namesBySets => namesBySets.map(namesBySet => new Set(namesBySet)));
  }

  /**
   * Check traffic type existence.
   * The returned promise is resolved with a boolean indicating whether the TT exist or not.
   * In case of wrapper operation failures, the promise resolves with a true value, assuming that the TT might exist.
   * It will never be rejected.
   */
  trafficTypeExists(trafficType: string): Promise<boolean> {
    // If there is a number there should be > 0, otherwise the TT is considered as not existent.
    return this.wrapper.get(this.keys.buildTrafficTypeKey(trafficType))
      .then((ttCount: string | null | number) => {
        if (ttCount === null) return false; // if entry doesn't exist, means that TT doesn't exist

        ttCount = parseInt(ttCount as string, 10);
        if (!isFiniteNumber(ttCount) || ttCount < 0) {
          this.log.info(LOG_PREFIX + `Could not validate traffic type existence of ${trafficType} due to data corruption of some sorts.`);
          return false;
        }

        return ttCount > 0;
      }).catch(e => {
        this.log.error(LOG_PREFIX + `Could not validate traffic type existence of ${trafficType} due to an error: ${e}.`);
        // If there is an error, bypass the validation so the event can get tracked.
        return true;
      });
  }

  /**
   * Set till number.
   * The returned promise is resolved when the operation success,
   * or rejected if it fails (e.g., wrapper operation fails).
   */
  setChangeNumber(changeNumber: number) {
    return this.wrapper.set(this.keys.buildDefinitionsTillKey(), changeNumber + '');
  }

  /**
   * Get till number or -1 if it's not defined.
   * The returned promise is resolved with the changeNumber or -1 if it doesn't exist or a wrapper operation fails.
   * The promise will never be rejected.
   */
  getChangeNumber(): Promise<number> {
    return this.wrapper.get(this.keys.buildDefinitionsTillKey()).then((value) => {
      const i = parseInt(value as string, 10);

      return isNaNNumber(i) ? -1 : i;
    }).catch((e) => {
      this.log.error(LOG_PREFIX + 'Could not retrieve changeNumber from storage. Error: ' + e);
      return -1;
    });
  }

  // @TODO implement if required by DataLoader or producer mode
  clear() {
    return Promise.resolve(true);
  }

}
