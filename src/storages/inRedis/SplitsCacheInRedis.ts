import { isFiniteNumber, isNaNNumber } from '../../utils/lang';
import KeyBuilderSS from '../KeyBuilderSS';
import { ISplitsCacheAsync } from '../types';
import { logFactory } from '../../logger/sdkLogger';
import { Redis } from 'ioredis';
const log = logFactory('splitio-storage:redis');

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
 * Default ISplitsCacheSync implementation that stores split definitions in memory.
 * Supported by all JS runtimes.
 */
export default class SplitsCacheInRedis implements ISplitsCacheAsync {

  private readonly redis: Redis;
  private readonly keys: KeyBuilderSS;
  private redisError?: string;

  constructor(keys: KeyBuilderSS, redis: Redis) {
    this.redis = redis;
    this.keys = keys;

    this.redis.on('error', (e) => {
      this.redisError = e;
    });

    this.redis.on('connect', () => {
      this.redisError = undefined;
    });
  }

  addSplit(name: string, split: string): Promise<boolean> {
    return this.redis.set(
      this.keys.buildSplitKey(name), split
    ).then(
      status => status === 'OK'
    );
  }

  addSplits(entries: [string, string][]): Promise<boolean[]> {
    if (entries.length) {
      const cmds = entries.map(keyValuePair => ['set', this.keys.buildSplitKey(keyValuePair[0]), keyValuePair[1]]);

      return this.redis.pipeline(cmds)
        .exec()
        .then(processPipelineAnswer)
        .then(answers => answers.map((status: string) => status === 'OK'));
    } else {
      return Promise.resolve([true]);
    }
  }

  /**
   * Remove a given split from Redis. Returns the number of deleted keys.
   */
  removeSplit(name: string): Promise<number> {
    return this.redis.del(this.keys.buildSplitKey(name));
  }

  /**
   * Bulk delete of splits from Redis. Returns the number of deleted keys.
   */
  removeSplits(names: string[]): Promise<number> {
    if (names.length) {
      return this.redis.del(names.map(n => this.keys.buildSplitKey(n)));
    } else {
      return Promise.resolve(0);
    }
  }

  /**
   * Get split definition or null if it's not defined.
   */
  getSplit(name: string): Promise<string | null> {
    if (this.redisError) {
      log.error(this.redisError);

      throw this.redisError;
    }

    return this.redis.get(this.keys.buildSplitKey(name));
  }

  /**
   * Set till number.
   *
   * @TODO pending error handling
   */
  setChangeNumber(changeNumber: number): Promise<boolean> {
    return this.redis.set(this.keys.buildSplitsTillKey(), changeNumber + '').then(
      status => status === 'OK'
    );
  }

  /**
   * Get till number or null if it's not defined.
   *
   * @TODO pending error handling
   */
  getChangeNumber(): Promise<number> {
    return this.redis.get(this.keys.buildSplitsTillKey()).then((value: string | null) => {
      const i = parseInt(value as string, 10);

      return isNaNNumber(i) ? -1 : i;
    });
  }

  /**
   * @TODO we need to benchmark which is the maximun number of commands we could
   *       pipeline without kill redis performance.
   */
  getAll(): Promise<string[]> {
    return this.redis.keys(this.keys.searchPatternForSplitKeys()).then(
      (listOfKeys) => this.redis.pipeline(listOfKeys.map(k => ['get', k])).exec()
    ).then(processPipelineAnswer);
  }

  getSplitNames(): Promise<string[]> {
    return this.redis.keys(this.keys.searchPatternForSplitKeys()).then(
      (listOfKeys) => listOfKeys.map(this.keys.extractKey)
    );
  }

  trafficTypeExists(trafficType: string): Promise<boolean> {
    // If there is a number there should be > 0, otherwise the TT is considered as not existent.
    return this.redis.get(this.keys.buildTrafficTypeKey(trafficType))
      .then((ttCount: string | null | number) => {
        ttCount = parseInt(ttCount as string, 10);
        if (!isFiniteNumber(ttCount) || ttCount < 0) {
          log.info(`Could not validate traffic type existance of ${trafficType} due to data corruption of some sorts.`);
          return false;
        }

        return ttCount > 0;
      })
      .catch(e => {
        log.error(`Could not validate traffic type existance of ${trafficType} due to an error: ${e}.`);
        // If there is an error, bypass the validation so the event can get tracked.
        return true;
      });
  }

  // noop, just keeping the interface. This is used by client-side implementations only.
  usesSegments(): Promise<boolean> {
    return Promise.resolve(true);
  }

  /**
   * Delete everything in the current database.
   *
   * @NOTE documentation says it never fails.
   */
  clear(): Promise<boolean> {
    return this.redis.flushdb().then(status => status === 'OK');
  }

  /**
   * Fetches multiple splits definitions.
   */
  getSplits(names: string[]): Promise<Record<string, string | null>> {
    if (this.redisError) {
      log.error(this.redisError);

      throw this.redisError;
    }
    const splits: Record<string, string | null> = {};
    const keys = names.map(name => this.keys.buildSplitKey(name));
    return this.redis.mget(...keys)
      .then(splitDefinitions => {
        names.forEach((name, idx) => {
          splits[name] = splitDefinitions[idx];
        });
        return Promise.resolve(splits);
      })
      .catch(e => {
        log.error(`Could not grab splits due to an error: ${e}.`);
        return Promise.reject(e);
      });
  }

  /**
   * Check if the splits information is already stored in cache. Redis would actually be the cache.
   * Noop, just keeping the interface. This is used by client-side implementations only.
   */
  checkCache(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
