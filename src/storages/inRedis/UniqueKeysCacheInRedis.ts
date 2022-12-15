import { IUniqueKeysCacheBase } from '../types';
import { Redis } from 'ioredis';
import { UniqueKeysCacheInMemory } from '../inMemory/UniqueKeysCacheInMemory';
import { setToArray } from '../../utils/lang/sets';
import { DEFAULT_CACHE_SIZE, REFRESH_RATE, TTL_REFRESH } from './constants';
import { LOG_PREFIX } from './constants';
import { ILogger } from '../../logger/types';
import { UniqueKeysItemSs } from '../../sync/submitters/types';

export class UniqueKeysCacheInRedis extends UniqueKeysCacheInMemory implements IUniqueKeysCacheBase {

  private readonly log: ILogger;
  private readonly key: string;
  private readonly redis: Redis;
  private readonly refreshRate: number;
  private intervalId: any;

  constructor(log: ILogger, key: string, redis: Redis, uniqueKeysQueueSize = DEFAULT_CACHE_SIZE, refreshRate = REFRESH_RATE) {
    super(uniqueKeysQueueSize);
    this.log = log;
    this.key = key;
    this.redis = redis;
    this.refreshRate = refreshRate;
    this.onFullQueue = () => { this.postUniqueKeysInRedis(); };
  }

  private postUniqueKeysInRedis() {
    const featureNames = Object.keys(this.uniqueKeysTracker);
    if (!featureNames.length) return Promise.resolve(false);

    const uniqueKeysArray = featureNames.map((featureName) => {
      const featureKeys = setToArray(this.uniqueKeysTracker[featureName]);
      const uniqueKeysPayload = {
        f: featureName,
        ks: featureKeys
      };
      return JSON.stringify(uniqueKeysPayload);
    });

    this.clear();
    return this.redis.rpush(this.key, uniqueKeysArray)
      .then(data => {
        // If this is the creation of the key on Redis, set the expiration for it in 3600 seconds.
        if (data === featureNames.length) {
          return this.redis.expire(this.key, TTL_REFRESH);
        }
      })
      .catch(err => {
        this.log.error(`${LOG_PREFIX}Error in uniqueKeys pipeline: ${err}.`);
        return false;
      });
  }


  start() {
    this.intervalId = setInterval(this.postUniqueKeysInRedis.bind(this), this.refreshRate);
  }

  stop() {
    clearInterval(this.intervalId);
    return this.postUniqueKeysInRedis();
  }

  /**
   * Async consumer API, used by synchronizer.
   * @param count number of items to pop from the queue. If not provided or equal 0, all items will be popped.
   */
  popNRaw(count = 0): Promise<UniqueKeysItemSs[]> {
    return this.redis.lrange(this.key, 0, count - 1).then(uniqueKeyItems => {
      return this.redis.ltrim(this.key, uniqueKeyItems.length, -1)
        .then(() => uniqueKeyItems.map(uniqueKeyItem => JSON.parse(uniqueKeyItem)));
    });
  }

}
