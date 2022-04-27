import { ILogger } from '../../logger/types';
import { Method } from '../../sync/submitters/types';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { TelemetryCacheAsync } from '../types';
import { findLatencyIndex } from '../findLatencyIndex';
import { Redis } from 'ioredis';

export class TelemetryCacheInRedis implements TelemetryCacheAsync {

  /**
   * Create a Telemetry cache that uses Redis as storage.
   * @param log  Logger instance.
   * @param keys  Key builder.
   * @param redis  Redis client.
   */
  constructor(private readonly log: ILogger, private readonly keys: KeyBuilderSS, private readonly redis: Redis) { }

  recordLatency(method: Method, latencyMs: number) {
    const [key, field] = this.keys.buildLatencyKey(method, findLatencyIndex(latencyMs)).split('::');
    return this.redis.hincrby(key, field, 1)
      .catch(() => { /* Handle rejections for telemetry */ });
  }
  recordException(method: Method) {
    const [key, field] = this.keys.buildExceptionKey(method).split('::');
    return this.redis.hincrby(key, field, 1)
      .catch(() => { /* Handle rejections for telemetry */ });
  }

}
