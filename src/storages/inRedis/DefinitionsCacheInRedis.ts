import { isFiniteNumber, isNaNNumber } from '../../utils/lang';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';
import { IDefinition, ISplitFiltersValidation } from '../../dtos/types';
import { AbstractDefinitionsCacheAsync } from '../AbstractDefinitionsCacheAsync';
import { returnDifference } from '../../utils/lang/sets';
import type { RedisAdapter } from './RedisAdapter';

/**
 * Discard errors for an answer of multiple operations.
 */
function processPipelineAnswer(results: Array<[Error | null, unknown]> | null): string[] {
  return results ? results.reduce((accum: string[], errValuePair: [Error | null, unknown]) => {
    if (errValuePair[0] === null) accum.push(errValuePair[1] as string);
    return accum;
  }, []) : [];
}

/**
 * IDefinitionsCacheAsync implementation that stores definitions in Redis.
 * Supported by Node.js
 */
export class DefinitionsCacheInRedis extends AbstractDefinitionsCacheAsync {

  private readonly log: ILogger;
  private readonly redis: RedisAdapter;
  private readonly keys: KeyBuilderSS;
  private redisError?: Error;
  private readonly setsFilter: string[];

  constructor(log: ILogger, keys: KeyBuilderSS, redis: RedisAdapter, splitFiltersValidation?: ISplitFiltersValidation) {
    super();
    this.log = log;
    this.redis = redis;
    this.keys = keys;
    this.setsFilter = splitFiltersValidation ? splitFiltersValidation.groupedFilters.bySet : [];

    // There is no need to listen for redis 'error' event, because in that case ioredis calls will be rejected and handled by redis storage adapters.
    // But it is done just to avoid getting the ioredis message `Unhandled error event`.
    this.redis.on('error', (e: Error) => {
      this.redisError = e;
    });

    this.redis.on('connect', () => {
      this.redisError = undefined;
    });
  }

  private _decrementCounts(definition: IDefinition) {
    const ttKey = this.keys.buildTrafficTypeKey(definition.trafficTypeName);
    return this.redis.decr(ttKey).then((count: number) => {
      if (count === 0) return this.redis.del(ttKey);
    });
  }

  private _incrementCounts(definition: IDefinition) {
    const ttKey = this.keys.buildTrafficTypeKey(definition.trafficTypeName);
    return this.redis.incr(ttKey);
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
      ...removeFromSets.map(setName => this.redis.srem(this.keys.buildSetKey(setName), items)),
      ...addToSets.map(setName => this.redis.sadd(this.keys.buildSetKey(setName), items))
    ]);
  }

  /**
   * Add a given definition.
   * The returned promise is resolved when the operation success
   * or rejected if it fails (e.g., redis operation fails)
   */
  add(definition: IDefinition): Promise<boolean> {
    const name = definition.name;
    const definitionKey = this.keys.buildDefinitionKey(name);
    return this.redis.get(definitionKey).then((definitionFromStorage: string | null) => {

      // handling parsing error
      let parsedPreviousDefinition: IDefinition, stringifiedNewDefinition;
      try {
        parsedPreviousDefinition = definitionFromStorage ? JSON.parse(definitionFromStorage) : undefined;
        stringifiedNewDefinition = JSON.stringify(definition);
      } catch (e) {
        throw new Error('Error parsing feature flag definition: ' + e);
      }

      return this.redis.set(definitionKey, stringifiedNewDefinition).then(() => {
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
   * The returned promise is resolved when the operation success, with true or false indicating if the definition existed (and was removed) or not.
   * or rejected if it fails (e.g., redis operation fails).
   */
  remove(name: string) {
    return this.get(name).then((definition) => {
      if (definition) {
        return this._decrementCounts(definition).then(() => this._updateSets(name, definition.sets));
      }
    }).then(() => {
      return this.redis.del(this.keys.buildDefinitionKey(name)).then((status: number) => status === 1);
    });
  }

  /**
   * Get definition or null if it's not defined.
   * Returned promise is rejected if redis operation fails.
   */
  get(name: string): Promise<IDefinition | null> {
    if (this.redisError) {
      this.log.error(LOG_PREFIX + this.redisError);

      return Promise.reject(this.redisError);
    }

    return this.redis.get(this.keys.buildDefinitionKey(name))
      .then((maybeDefinition: string | null) => maybeDefinition && JSON.parse(maybeDefinition));
  }

  /**
   * Set till number.
   * The returned promise is resolved when the operation success,
   * or rejected if it fails.
   */
  setChangeNumber(changeNumber: number): Promise<boolean> {
    return this.redis.set(this.keys.buildDefinitionsTillKey(), changeNumber + '').then(
      (status: string | null) => status === 'OK'
    );
  }

  /**
   * Get till number or -1 if it's not defined.
   * The returned promise is resolved with the changeNumber or -1 if it doesn't exist or a redis operation fails.
   * The promise will never be rejected.
   */
  getChangeNumber(): Promise<number> {
    return this.redis.get(this.keys.buildDefinitionsTillKey()).then((value: string | null) => {
      const i = parseInt(value as string, 10);

      return isNaNNumber(i) ? -1 : i;
    }).catch((e: unknown) => {
      this.log.error(LOG_PREFIX + 'Could not retrieve changeNumber from storage. Error: ' + e);
      return -1;
    });
  }

  /**
   * Get list of all definitions.
   * The returned promise is resolved with the list of definitions,
   * or rejected if redis operation fails.
   */
  // @TODO we need to benchmark which is the maximun number of commands we could pipeline without kill redis performance.
  getAll(): Promise<IDefinition[]> {
    return this.redis.keys(this.keys.searchPatternForDefinitionKeys())
      .then((listOfKeys: string[]) => this.redis.pipeline(listOfKeys.map((k: string) => ['get', k])).exec())
      .then(processPipelineAnswer)
      .then((definitions: string[]) => definitions.map((definition: string) => {
        return JSON.parse(definition);
      }));
  }

  /**
   * Get list of definition names.
   * The returned promise is resolved with the list of names,
   * or rejected if redis operation fails.
   */
  getNames(): Promise<string[]> {
    return this.redis.keys(this.keys.searchPatternForDefinitionKeys()).then(
      (listOfKeys: string[]) => listOfKeys.map(this.keys.extractKey)
    );
  }

  /**
   * Get list of definition names related to a given list of set names.
   * The returned promise is resolved with the list of names per set,
   * or rejected if the pipelined redis operation fails (e.g., timeout).
  */
  getNamesBySets(sets: string[]): Promise<Set<string>[]> {
    return this.redis.pipeline(sets.map(set => ['smembers', this.keys.buildSetKey(set)])).exec()
      .then((results: [Error | null, unknown][] | null) => results ? results.map(([e, value]: [Error | null, unknown], index: number) => {
        if (e === null) return value as string;

        this.log.error(LOG_PREFIX + `Could not read result from get members of set ${sets[index]} due to an error: ${e}`);
      }) : [])
      .then((namesBySets: (string | undefined)[]) => namesBySets.map((namesBySet: string | undefined) => new Set(namesBySet)));
  }

  /**
   * Check traffic type existence.
   * The returned promise is resolved with a boolean indicating whether the TT exist or not.
   * In case of redis operation failure, the promise resolves with a true value, assuming that the TT might exist.
   * It will never be rejected.
   */
  trafficTypeExists(trafficType: string): Promise<boolean> {
    // If there is a number there should be > 0, otherwise the TT is considered as not existent.
    return this.redis.get(this.keys.buildTrafficTypeKey(trafficType))
      .then((ttCount: string | null | number) => {
        if (ttCount === null) return false; // if entry doesn't exist, means that TT doesn't exist

        ttCount = parseInt(ttCount as string, 10);
        if (!isFiniteNumber(ttCount) || ttCount < 0) {
          this.log.info(LOG_PREFIX + `Could not validate traffic type existence of ${trafficType} due to data corruption of some sorts.`);
          return false;
        }

        return ttCount > 0;
      })
      .catch((e: unknown) => {
        this.log.error(LOG_PREFIX + `Could not validate traffic type existence of ${trafficType} due to an error: ${e}.`);
        // If there is an error, bypass the validation so the event can get tracked.
        return true;
      });
  }

  // @TODO remove or implement. It is not being used.
  clear() {
    return Promise.resolve();
  }

  /**
   * Fetches multiple definitions.
   * Returned promise is rejected if redis operation fails.
   */
  getMany(names: string[]): Promise<Record<string, IDefinition | null>> {
    if (this.redisError) {
      this.log.error(LOG_PREFIX + this.redisError);

      return Promise.reject(this.redisError);
    }

    const keys = names.map(name => this.keys.buildDefinitionKey(name));
    return this.redis.mget(...keys)
      .then((stringifiedDefinitions: (string | null)[]) => {
        const definitions: Record<string, IDefinition | null> = {};
        names.forEach((name, idx) => {
          const definition = stringifiedDefinitions[idx];
          definitions[name] = definition && JSON.parse(definition);
        });
        return Promise.resolve(definitions);
      })
      .catch((e: unknown) => {
        this.log.error(LOG_PREFIX + `Could not grab feature flags due to an error: ${e}.`);
        return Promise.reject(e);
      });
  }

}
