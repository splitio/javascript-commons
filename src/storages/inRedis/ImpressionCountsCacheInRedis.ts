import { Redis } from 'ioredis';
import { ILogger } from '../../logger/types';
import { ImpressionCountsCacheInMemory } from '../inMemory/ImpressionCountsCacheInMemory';
import { LOG_PREFIX, REFRESH_RATE, TTL_REFRESH } from './constants';

export class ImpressionCountsCacheInRedis extends ImpressionCountsCacheInMemory {

  private readonly log: ILogger;
  private readonly key: string;
  private readonly redis: Redis;
  private readonly refreshRate: number;
  private intervalId: any;
  
  constructor(log: ILogger, key: string, redis: Redis, impressionCountsCacheSize?: number, refreshRate: number = REFRESH_RATE) {
    super(impressionCountsCacheSize);
    this.log = log;
    this.key = key;
    this.redis = redis;
    this.refreshRate = refreshRate;
    this.onFullQueue = () => { this.postImpressionCountsInRedis(); };
  }
  
  postImpressionCountsInRedis(){
    const counts = this.pop();
    const keys = Object.keys(counts);
    if (!keys) return Promise.resolve(false);
    const pipeline = this.redis.pipeline();
    keys.forEach(key => {
      pipeline.hincrby(this.key, key, counts[key]);
    });
    return pipeline.exec()
      .then(data => {
        // If this is the creation of the key on Redis, set the expiration for it in 3600 seconds.
        if (data.length && data.length === keys.length) {
          return this.redis.expire(this.key, TTL_REFRESH);
        }
      })
      .catch(err => {
        this.log.error(`${LOG_PREFIX}Error in impression counts pipeline: ${err}.`);
        return false;
      });
  }
  
  start() {
    this.intervalId = setInterval(this.postImpressionCountsInRedis.bind(this), this.refreshRate);
  }
  
  stop() {
    clearInterval(this.intervalId);
    return this.postImpressionCountsInRedis();
  }
}
