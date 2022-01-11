import { ICountsCacheAsync } from '../types';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { Redis } from 'ioredis';

export class CountsCacheInRedis implements ICountsCacheAsync {

  private readonly redis: Redis;
  private readonly keys: KeyBuilderSS;

  constructor(keys: KeyBuilderSS, redis: Redis) {
    this.keys = keys;
    this.redis = redis;
  }

  track(metricName: string): Promise<boolean> {
    return this.redis.incr(this.keys.buildCountKey(metricName)).catch(() => {
      // noop, for telemetry metrics there's no need to throw.
    }).then(() => true);
  }
}
