import { Redis } from 'ioredis';
import { ImpressionCountsCacheInMemory } from '../inMemory/ImpressionCountsCacheInMemory';
import { IImpressionCountsCacheInRedis } from '../types';

const IMPRESSION_COUNT_REFRESH_RATE = 300000; // 300.000 ms = start after 5 mins

export class ImpressionCountsCacheInRedis extends ImpressionCountsCacheInMemory implements IImpressionCountsCacheInRedis {

  private readonly key: string;
  private readonly redis: Redis;
  private handle: any;
  
  constructor(key: string, redis: Redis, impressionCountsCacheSize?: number) {
    super(impressionCountsCacheSize);
    this.key = key;
    this.redis = redis;
    this.onFullQueue = () => { this.postImpressionCountsInRedis(); };
  }
  
  postImpressionCountsInRedis(){
    const counts = this.pop();
    const keys = Object.keys(counts);
    const pipeline = this.redis.pipeline();
    keys.forEach(key => {
      pipeline.hincrby(this.key, key, counts[key]);
    });
    return pipeline.exec();
  }
  
  start(refreshRate: number = IMPRESSION_COUNT_REFRESH_RATE) {
    this.handle = setInterval(this.postImpressionCountsInRedis.bind(this), refreshRate);
  }
  
  stop() {
    clearInterval(this.handle);
    this.handle = undefined;
  }
}
