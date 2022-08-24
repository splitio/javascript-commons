import { IUniqueKeysCacheBase } from '../types';
import { Redis } from 'ioredis';
import { UniqueKeysCacheInMemory } from '../inMemory/uniqueKeysCacheInMemory';
import { setToArray } from '../../utils/lang/sets';
import { DEFAULT_CACHE_SIZE, REFRESH_RATE, TTL_REFRESH } from './constants';
import { LOG_PREFIX } from './constants';
import { ILogger } from '../../logger/types';

export class UniqueKeysCacheInRedis extends UniqueKeysCacheInMemory implements IUniqueKeysCacheBase {

  private readonly log: ILogger;
  private readonly key: string;
  private readonly redis: Redis;
  private handle: any;
  
  constructor(log: ILogger, key: string, redis: Redis, uniqueKeysQueueSize: number = DEFAULT_CACHE_SIZE) {
    super(uniqueKeysQueueSize);
    this.log = log;
    this.key = key;
    this.redis = redis;
    this.onFullQueue = () => {this.postUniqueKeysInRedis();};
  }
  
  postUniqueKeysInRedis() {
    const pipeline = this.redis.pipeline();
    
    const featureNames = Object.keys(this.uniqueKeysTracker);
    for (let i = 0; i < featureNames.length; i++) {
      const featureName = featureNames[i];
      const featureKeys = setToArray(this.uniqueKeysTracker[featureName]);
      const uniqueKeysPayload = {
        f: featureName,
        ks: featureKeys
      };

      pipeline.rpush(this.key, JSON.stringify(uniqueKeysPayload));
    }
    this.clear();
    return pipeline.exec()
      .then(data => {
        // If this is the creation of the key on Redis, set the expiration for it in 3600 seconds.
        if (data.length && data.length === featureNames.length) {
          return this.redis.expire(this.key, TTL_REFRESH);
        }
      })
      .catch(err => {
        this.log.error(`${LOG_PREFIX}Error in uniqueKeys pipeline: ${err}.`);
        return false;
      });
  }
  
    
  start(refreshRate: number = REFRESH_RATE) {
    this.handle = setInterval(this.postUniqueKeysInRedis.bind(this), refreshRate);
  }
  
  stop() {
    clearInterval(this.handle);
  }
  
}
