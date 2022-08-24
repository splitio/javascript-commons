import { ILogger } from '../../types';
import { Method } from '../../sync/submitters/types';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { ITelemetryCacheAsync } from '../types';
import { findLatencyIndex } from '../findLatencyIndex';
import { Redis } from 'ioredis';
import { getTelemetryConfigStats } from '../../sync/submitters/telemetrySubmitter';
import { CONSUMER_MODE, STORAGE_REDIS } from '../../utils/constants';

export class TelemetryCacheInRedis implements ITelemetryCacheAsync {

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

  recordConfig() {
    const [key, field] = this.keys.buildInitKey().split('::');
    const value = JSON.stringify(getTelemetryConfigStats(CONSUMER_MODE, STORAGE_REDIS));
    return this.redis.hset(key, field, value).catch(() => { /* Handle rejections for telemetry */ });
  }
}
