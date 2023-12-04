import { isFiniteNumber, isNaNNumber } from '../../utils/lang';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';
import { ISplit, ISplitFiltersValidation } from '../../dtos/types';
import { AbstractSplitsCacheAsync } from '../AbstractSplitsCacheAsync';
import { ISet, _Set, returnDifference } from '../../utils/lang/sets';
import type { RedisAdapter } from './RedisAdapter';

/**
 * Discard errors for an answer of multiple operations.
 */
function processPipelineAnswer(results: Array<[Error | null, string]>): string[] {
  return results.reduce((accum: string[], errValuePair: [Error | null, string]) => {
    if (errValuePair[0] === null) accum.push(errValuePair[1]);
    return accum;
  }, []);
}

/**
 * ISplitsCacheAsync implementation that stores split definitions in Redis.
 * Supported by Node.
 */
export class SplitsCacheInRedis extends AbstractSplitsCacheAsync {

  private readonly log: ILogger;
  private readonly redis: RedisAdapter;
  private readonly keys: KeyBuilderSS;
  private redisError?: string;
  private readonly flagSetsFilter: string[];

  constructor(log: ILogger, keys: KeyBuilderSS, redis: RedisAdapter, splitFiltersValidation?: ISplitFiltersValidation) {
    super();
    this.log = log;
    this.redis = redis;
    this.keys = keys;
    this.flagSetsFilter = splitFiltersValidation ? splitFiltersValidation.groupedFilters.bySet : [];

    // There is no need to listen for redis 'error' event, because in that case ioredis calls will be rejected and handled by redis storage adapters.
    // But it is done just to avoid getting the ioredis message `Unhandled error event`.
    this.redis.on('error', (e) => {
      this.redisError = e;
    });

    this.redis.on('connect', () => {
      this.redisError = undefined;
    });
  }

  private _decrementCounts(split: ISplit) {
    const ttKey = this.keys.buildTrafficTypeKey(split.trafficTypeName);
    return this.redis.decr(ttKey).then(count => {
      if (count === 0) return this.redis.del(ttKey);
    });
  }

  private _incrementCounts(split: ISplit) {
    const ttKey = this.keys.buildTrafficTypeKey(split.trafficTypeName);
    return this.redis.incr(ttKey);
  }

  private _updateFlagSets(featureFlagName: string, flagSetsOfRemovedFlag?: string[], flagSetsOfAddedFlag?: string[]) {
    const removeFromFlagSets = returnDifference(flagSetsOfRemovedFlag, flagSetsOfAddedFlag);

    let addToFlagSets = returnDifference(flagSetsOfAddedFlag, flagSetsOfRemovedFlag);
    if (this.flagSetsFilter.length > 0) {
      addToFlagSets = addToFlagSets.filter(flagSet => {
        return this.flagSetsFilter.some(filterFlagSet => filterFlagSet === flagSet);
      });
    }

    const items = [featureFlagName];

    return Promise.all([
      ...removeFromFlagSets.map(flagSetName => this.redis.srem(this.keys.buildFlagSetKey(flagSetName), items)),
      ...addToFlagSets.map(flagSetName => this.redis.sadd(this.keys.buildFlagSetKey(flagSetName), items))
    ]);
  }

  /**
   * Add a given split.
   * The returned promise is resolved when the operation success
   * or rejected if it fails (e.g., redis operation fails)
   */
  addSplit(name: string, split: ISplit): Promise<boolean> {
    const splitKey = this.keys.buildSplitKey(name);
    return this.redis.get(splitKey).then(splitFromStorage => {

      // handling parsing error
      let parsedPreviousSplit: ISplit, stringifiedNewSplit;
      try {
        parsedPreviousSplit = splitFromStorage ? JSON.parse(splitFromStorage) : undefined;
        stringifiedNewSplit = JSON.stringify(split);
      } catch (e) {
        throw new Error('Error parsing feature flag definition: ' + e);
      }

      return this.redis.set(splitKey, stringifiedNewSplit).then(() => {
        // avoid unnecessary increment/decrement operations
        if (parsedPreviousSplit && parsedPreviousSplit.trafficTypeName === split.trafficTypeName) return;

        // update traffic type counts
        return this._incrementCounts(split).then(() => {
          if (parsedPreviousSplit) return this._decrementCounts(parsedPreviousSplit);
        });
      }).then(() => this._updateFlagSets(name, parsedPreviousSplit && parsedPreviousSplit.sets, split.sets));
    }).then(() => true);
  }

  /**
   * Add a list of splits.
   * The returned promise is resolved when the operation success
   * or rejected if it fails (e.g., redis operation fails)
   */
  addSplits(entries: [string, ISplit][]): Promise<boolean[]> {
    return Promise.all(entries.map(keyValuePair => this.addSplit(keyValuePair[0], keyValuePair[1])));
  }

  /**
   * Remove a given split.
   * The returned promise is resolved when the operation success, with 1 or 0 indicating if the split existed or not.
   * or rejected if it fails (e.g., redis operation fails).
   */
  removeSplit(name: string) {
    return this.getSplit(name).then((split) => {
      if (split) {
        return this._decrementCounts(split).then(() => this._updateFlagSets(name, split.sets));
      }
    }).then(() => {
      return this.redis.del(this.keys.buildSplitKey(name));
    });
  }

  /**
   * Remove a list of splits.
   * The returned promise is resolved when the operation success,
   * or rejected if it fails (e.g., redis operation fails).
   */
  removeSplits(names: string[]): Promise<any> {
    return Promise.all(names.map(name => this.removeSplit(name)));
  }

  /**
   * Get split definition or null if it's not defined.
   * Returned promise is rejected if redis operation fails.
   */
  getSplit(name: string): Promise<ISplit | null> {
    if (this.redisError) {
      this.log.error(LOG_PREFIX + this.redisError);

      return Promise.reject(this.redisError);
    }

    return this.redis.get(this.keys.buildSplitKey(name))
      .then(maybeSplit => maybeSplit && JSON.parse(maybeSplit));
  }

  /**
   * Set till number.
   * The returned promise is resolved when the operation success,
   * or rejected if it fails.
   */
  setChangeNumber(changeNumber: number): Promise<boolean> {
    return this.redis.set(this.keys.buildSplitsTillKey(), changeNumber + '').then(
      status => status === 'OK'
    );
  }

  /**
   * Get till number or -1 if it's not defined.
   * The returned promise is resolved with the changeNumber or -1 if it doesn't exist or a redis operation fails.
   * The promise will never be rejected.
   */
  getChangeNumber(): Promise<number> {
    return this.redis.get(this.keys.buildSplitsTillKey()).then((value: string | null) => {
      const i = parseInt(value as string, 10);

      return isNaNNumber(i) ? -1 : i;
    }).catch((e) => {
      this.log.error(LOG_PREFIX + 'Could not retrieve changeNumber from storage. Error: ' + e);
      return -1;
    });
  }

  /**
   * Get list of all split definitions.
   * The returned promise is resolved with the list of split definitions,
   * or rejected if redis operation fails.
   *
   * @TODO we need to benchmark which is the maximun number of commands we could
   *       pipeline without kill redis performance.
   */
  getAll(): Promise<ISplit[]> {
    return this.redis.keys(this.keys.searchPatternForSplitKeys())
      .then((listOfKeys) => this.redis.pipeline(listOfKeys.map(k => ['get', k])).exec())
      .then(processPipelineAnswer)
      .then((splitDefinitions) => splitDefinitions.map((splitDefinition) => {
        return JSON.parse(splitDefinition);
      }));
  }

  /**
   * Get list of split names.
   * The returned promise is resolved with the list of split names,
   * or rejected if redis operation fails.
   */
  getSplitNames(): Promise<string[]> {
    return this.redis.keys(this.keys.searchPatternForSplitKeys()).then(
      (listOfKeys) => listOfKeys.map(this.keys.extractKey)
    );
  }

  /**
   * Get list of feature flag names related to a given list of flag set names.
   * The returned promise is resolved with the list of feature flag names per flag set,
   * or rejected if the pipelined redis operation fails (e.g., timeout).
  */
  getNamesByFlagSets(flagSets: string[]): Promise<ISet<string>[]> {
    return this.redis.pipeline(flagSets.map(flagSet => ['smembers', this.keys.buildFlagSetKey(flagSet)])).exec()
      .then((results) => results.map(([e, value], index) => {
        if (e === null) return value;

        this.log.error(LOG_PREFIX + `Could not read result from get members of flag set ${flagSets[index]} due to an error: ${e}`);
      }))
      .then(namesByFlagSets => namesByFlagSets.map(namesByFlagSet => new _Set(namesByFlagSet)));
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
      .catch(e => {
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
   * Fetches multiple splits definitions.
   * Returned promise is rejected if redis operation fails.
   */
  getSplits(names: string[]): Promise<Record<string, ISplit | null>> {
    if (this.redisError) {
      this.log.error(LOG_PREFIX + this.redisError);

      return Promise.reject(this.redisError);
    }

    const splits: Record<string, ISplit | null> = {};
    const keys = names.map(name => this.keys.buildSplitKey(name));
    return this.redis.mget(...keys)
      .then(splitDefinitions => {
        names.forEach((name, idx) => {
          const split = splitDefinitions[idx];
          splits[name] = split && JSON.parse(split);
        });
        return Promise.resolve(splits);
      })
      .catch(e => {
        this.log.error(LOG_PREFIX + `Could not grab feature flags due to an error: ${e}.`);
        return Promise.reject(e);
      });
  }

}
