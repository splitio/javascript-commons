import { isFiniteNumber, isNaNNumber } from '../../utils/lang';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { Redis } from 'ioredis';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';
import { ISplit } from '../../dtos/types';
import { AbstractSplitsCacheAsync } from '../AbstractSplitsCacheAsync';

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
  private readonly redis: Redis;
  private readonly keys: KeyBuilderSS;
  private redisError?: string;

  constructor(log: ILogger, keys: KeyBuilderSS, redis: Redis) {
    super();
    this.log = log;
    this.redis = redis;
    this.keys = keys;

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

  /**
   * Add a given split.
   * The returned promise is resolved when the operation success
   * or rejected if it fails (e.g., redis operation fails)
   */
  addSplit(name: string, split: ISplit): Promise<boolean> {
    const splitKey = this.keys.buildSplitKey(name);
    return this.redis.get(splitKey).then(splitFromStorage => {

      // handling parsing errors
      let parsedPreviousSplit: ISplit, newStringifiedSplit;
      try {
        parsedPreviousSplit = splitFromStorage ? JSON.parse(splitFromStorage) : undefined;
        newStringifiedSplit = JSON.stringify(split);
      } catch (e) {
        throw new Error('Error parsing feature flag definition: ' + e);
      }

      return this.redis.set(splitKey, newStringifiedSplit).then(() => {
        // avoid unnecessary increment/decrement operations
        if (parsedPreviousSplit && parsedPreviousSplit.trafficTypeName === split.trafficTypeName) return;

        // update traffic type counts
        return this._incrementCounts(split).then(() => {
          if (parsedPreviousSplit) return this._decrementCounts(parsedPreviousSplit);
        });
      });
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
  removeSplit(name: string): Promise<number> {
    return this.getSplit(name).then((split) => {
      if (split) {
        this._decrementCounts(split);
      }
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
        return JSON.parse(splitDefinition as string);
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
          this.log.info(LOG_PREFIX + `Could not validate traffic type existance of ${trafficType} due to data corruption of some sorts.`);
          return false;
        }

        return ttCount > 0;
      })
      .catch(e => {
        this.log.error(LOG_PREFIX + `Could not validate traffic type existance of ${trafficType} due to an error: ${e}.`);
        // If there is an error, bypass the validation so the event can get tracked.
        return true;
      });
  }

  /**
   * Delete everything in the current database.
   *
   * @NOTE documentation says it never fails.
   */
  clear() {
    return this.redis.flushdb().then(status => status === 'OK');
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
