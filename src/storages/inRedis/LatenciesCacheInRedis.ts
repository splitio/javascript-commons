import { ILatenciesCacheAsync } from '../types';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { findLatencyIndex } from '../findLatencyIndex';
import { Redis } from 'ioredis';

export class LatenciesCacheInRedis implements ILatenciesCacheAsync {

  private readonly redis: Redis;
  private readonly keys: KeyBuilderSS;

  constructor(keys: KeyBuilderSS, redis: Redis) {
    this.keys = keys;
    this.redis = redis;
  }

  track(metricName: string, latency: number): Promise<boolean> {
    const bucketNumber = findLatencyIndex(latency);

    return this.redis.incr(this.keys.buildLatencyKey(metricName, bucketNumber)).catch(() => {
      // noop, for telemetry metrics there's no need to throw.
    }).then(() => true);
  }
}
