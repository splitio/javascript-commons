import { IUniqueKeysCacheBase } from '../types';
import { Redis } from 'ioredis';
import { UniqueKeysCacheInMemory } from '../inMemory/uniqueKeysCacheInMemory';
import { setToArray } from '../../utils/lang/sets';
import { DEFAULT_CACHE_SIZE, UNIQUE_KEYS_REFRESH_RATE } from './constants';

export class UniqueKeysCacheInRedis extends UniqueKeysCacheInMemory implements IUniqueKeysCacheBase {

  private readonly key: string;
  private readonly redis: Redis;
  private handle: any;
  
  constructor(key: string, redis: Redis, uniqueKeysQueueSize: number = DEFAULT_CACHE_SIZE) {
    super(uniqueKeysQueueSize);
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
    return pipeline.exec();
  }
  
    
  start(refreshRate: number = UNIQUE_KEYS_REFRESH_RATE) {
    this.handle = setInterval(this.postUniqueKeysInRedis.bind(this), refreshRate);
  }
  
  stop() {
    clearInterval(this.handle);
  }
  
}
