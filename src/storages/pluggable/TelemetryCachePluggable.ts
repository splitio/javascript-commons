import { ILogger } from '../../logger/types';
import { Method, MultiConfigs, MultiMethodExceptions, MultiMethodLatencies } from '../../sync/submitters/types';
import { KeyBuilderSS, parseExceptionField, parseLatencyField, parseMetadata } from '../KeyBuilderSS';
import { IPluggableStorageWrapper, ITelemetryCacheAsync } from '../types';
import { findLatencyIndex } from '../findLatencyIndex';
import { getTelemetryConfigStats } from '../../sync/submitters/telemetrySubmitter';
import { CONSUMER_MODE, STORAGE_PLUGGABLE } from '../../utils/constants';
import { isString, isNaNNumber } from '../../utils/lang';
import { _Map } from '../../utils/lang/maps';
import { MAX_LATENCY_BUCKET_COUNT, newBuckets } from '../inMemory/TelemetryCacheInMemory';

export class TelemetryCachePluggable implements ITelemetryCacheAsync {

  /**
   * Create a Telemetry cache that uses a storage wrapper.
   * @param log  Logger instance.
   * @param keys  Key builder.
   * @param wrapper  Adapted wrapper storage.
   */
  constructor(private readonly log: ILogger, private readonly keys: KeyBuilderSS, private readonly wrapper: IPluggableStorageWrapper) { }

  recordLatency(method: Method, latencyMs: number) {
    return this.wrapper.incr(this.keys.buildLatencyKey(method, findLatencyIndex(latencyMs)))
      .catch(() => { /* Handle rejections for telemetry */ });
  }
  recordException(method: Method) {
    return this.wrapper.incr(this.keys.buildExceptionKey(method))
      .catch(() => { /* Handle rejections for telemetry */ });
  }

  recordConfig() {
    const value = JSON.stringify(getTelemetryConfigStats(CONSUMER_MODE, STORAGE_PLUGGABLE));
    return this.wrapper.set(this.keys.buildInitKey(), value).catch(() => { /* Handle rejections for telemetry */ });
  }

  popLatencies(): Promise<MultiMethodLatencies | void> {
    return this.wrapper.getKeysByPrefix(this.keys.latencyPrefix).then(latencyKeys => {
      return this.wrapper.getMany(latencyKeys).then(latencies => {

        const result: MultiMethodLatencies = new _Map();

        for (let i = 0; i < latencyKeys.length; i++) {
          const field = latencyKeys[i].split('::')[1];

          const parsedField = parseLatencyField(field);
          if (isString(parsedField)) {
            this.log.error(`Ignoring invalid latency field: ${field}: ${parsedField}`);
            return;
          }

          // @ts-ignore
          const count = parseInt(latencies[i]);
          if (isNaNNumber(count)) {
            this.log.error(`Ignoring latency with invalid count: ${latencies[i]}`);
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

          result.get(metadata)![method][bucket] = count;
        }

        return Promise.all(latencyKeys.map((latencyKey) => this.wrapper.del(latencyKey))).then(() => result);
      });
    }).catch((e) => {
      this.log.error(`Error fetching latencies for SDK Methods: ${e}`);
    });
  }

  popExceptions(): Promise<MultiMethodExceptions | void> {
    return this.wrapper.getKeysByPrefix(this.keys.exceptionPrefix).then(exceptionKeys => {
      return this.wrapper.getMany(exceptionKeys).then(exceptions => {

        const result: MultiMethodExceptions = new _Map();

        for (let i = 0; i < exceptionKeys.length; i++) {
          const field = exceptionKeys[i].split('::')[1];

          const parsedField = parseExceptionField(field);
          if (isString(parsedField)) {
            this.log.error(`Ignoring invalid exception field: ${field}: ${parsedField}`);
            return;
          }

          // @ts-ignore
          const count = parseInt(exceptions[i]);
          if (isNaNNumber(count)) {
            this.log.error(`Ignoring exception with invalid count: ${exceptions[i]}`);
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
        }

        return Promise.all(exceptionKeys.map((exceptionKey) => this.wrapper.del(exceptionKey))).then(() => result);
      });
    }).catch((e) => {
      this.log.error(`Error fetching exceptions for SDK Methods: ${e}`);
    });
  }

  popConfigs(): Promise<MultiConfigs | void> {
    return this.wrapper.getKeysByPrefix(this.keys.initPrefix).then(configKeys => {
      return this.wrapper.getMany(configKeys).then(configs => {

        const result: MultiConfigs = new _Map();

        for (let i = 0; i < configKeys.length; i++) {
          const field = configKeys[i].split('::')[1];

          const parsedField = parseMetadata(field);
          if (isString(parsedField)) {
            this.log.error(`Ignoring invalid config field: ${field}: ${parsedField}`);
            return;
          }

          const [metadata] = parsedField;

          try { // @ts-ignore
            const config = JSON.parse(configs[i]);
            result.set(metadata, config);
          } catch (e) {
            this.log.error(`Ignoring invalid config: ${configs[i]}`);
          }
        }

        return Promise.all(configKeys.map((configKey) => this.wrapper.del(configKey))).then(() => result);
      });
    }).catch((e) => {
      this.log.error(`Error fetching SDK configs: ${e}`);
    });
  }
}
