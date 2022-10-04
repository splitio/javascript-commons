import { ILogger } from '../../logger/types';
import { Method, MultiConfigs, MultiMethodExceptions, MultiMethodLatencies } from '../../sync/submitters/types';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { ITelemetryCacheAsync } from '../types';
import { findLatencyIndex } from '../findLatencyIndex';
import { Redis } from 'ioredis';
import { getTelemetryConfigStats } from '../../sync/submitters/telemetrySubmitter';
import { CONSUMER_MODE, STORAGE_REDIS } from '../../utils/constants';
import { isNaNNumber, isString } from '../../utils/lang';
import { _Map } from '../../utils/lang/maps';
import { MAX_LATENCY_BUCKET_COUNT, newBuckets } from '../inMemory/TelemetryCacheInMemory';
import { parseLatencyField, parseExceptionField, parseMetadata } from '../utils';

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

  /**
   * Pop telemetry latencies.
   * The returned promise rejects if redis operations fail.
   */
  popLatencies(): Promise<MultiMethodLatencies> {
    return this.redis.hgetall(this.keys.latencyPrefix).then(latencies => {

      const result: MultiMethodLatencies = new _Map();

      Object.keys(latencies).forEach(field => {

        const parsedField = parseLatencyField(field);
        if (isString(parsedField)) {
          this.log.error(`Ignoring invalid latency field: ${field}: ${parsedField}`);
          return;
        }

        const count = parseInt(latencies[field]);
        if (isNaNNumber(count)) {
          this.log.error(`Ignoring latency with invalid count: ${latencies[field]}`);
          return;
        }

        const [metadata, method, bucket] = parsedField;

        if (bucket >= MAX_LATENCY_BUCKET_COUNT) {
          this.log.error(`Ignoring latency with invalid bucket: ${bucket}`);
          return;
        }

        if (!result.has(metadata)) result.set(metadata, {
          t: newBuckets(),
          ts: newBuckets(),
          tc: newBuckets(),
          tcs: newBuckets(),
          tr: newBuckets(),
        });

        result.get(metadata)![method]![bucket] = count;
      });

      return this.redis.del(this.keys.latencyPrefix).then(() => result);
    });
  }

  /**
   * Pop telemetry exceptions.
   * The returned promise rejects if redis operations fail.
   */
  popExceptions(): Promise<MultiMethodExceptions> {
    return this.redis.hgetall(this.keys.exceptionPrefix).then(exceptions => {

      const result: MultiMethodExceptions = new _Map();

      Object.keys(exceptions).forEach(field => {

        const parsedField = parseExceptionField(field);
        if (isString(parsedField)) {
          this.log.error(`Ignoring invalid exception field: ${field}: ${parsedField}`);
          return;
        }

        const count = parseInt(exceptions[field]);
        if (isNaNNumber(count)) {
          this.log.error(`Ignoring exception with invalid count: ${exceptions[field]}`);
          return;
        }

        const [metadata, method] = parsedField;

        if (!result.has(metadata)) result.set(metadata, {
          t: 0,
          ts: 0,
          tc: 0,
          tcs: 0,
          tr: 0,
        });

        result.get(metadata)![method] = count;
      });

      return this.redis.del(this.keys.exceptionPrefix).then(() => result);
    });
  }

  /**
   * Pop telemetry configs.
   * The returned promise rejects if redis operations fail.
   */
  popConfigs(): Promise<MultiConfigs> {
    return this.redis.hgetall(this.keys.initPrefix).then(configs => {

      const result: MultiConfigs = new _Map();

      Object.keys(configs).forEach(field => {

        const parsedField = parseMetadata(field);
        if (isString(parsedField)) {
          this.log.error(`Ignoring invalid config field: ${field}: ${parsedField}`);
          return;
        }

        const [metadata] = parsedField;

        try {
          const config = JSON.parse(configs[field]);
          result.set(metadata, config);
        } catch (e) {
          this.log.error(`Ignoring invalid config: ${configs[field]}`);
        }
      });

      return this.redis.del(this.keys.initPrefix).then(() => result);
    });
  }
}
