import { RedisAdapter } from './RedisAdapter';
import { IStorageAsync, IStorageAsyncFactory, IStorageFactoryParams } from '../types';
import { validatePrefix } from '../KeyBuilder';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { SplitsCacheInRedis } from './SplitsCacheInRedis';
import { SegmentsCacheInRedis } from './SegmentsCacheInRedis';
import { ImpressionsCacheInRedis } from './ImpressionsCacheInRedis';
import { EventsCacheInRedis } from './EventsCacheInRedis';
import { STORAGE_REDIS } from '../../utils/constants';
import { TelemetryCacheInRedis } from './TelemetryCacheInRedis';
import { getTelemetryConfigStats } from '../../sync/submitters/telemetrySubmitter';

export interface InRedisStorageOptions {
  prefix?: string
  options?: Record<string, any>
}

/**
 * InRedis storage factory for consumer server-side SplitFactory, that uses `Ioredis` Redis client for Node.
 * @see {@link https://www.npmjs.com/package/ioredis}
 */
export function InRedisStorage(options: InRedisStorageOptions = {}): IStorageAsyncFactory {

  const prefix = validatePrefix(options.prefix);

  function InRedisStorageFactory({ log, metadata, onReadyCb, mode }: IStorageFactoryParams): IStorageAsync {

    const keys = new KeyBuilderSS(prefix, metadata);
    const redisClient = new RedisAdapter(log, options.options || {});

    // subscription to Redis connect event in order to emit SDK_READY event on consumer mode
    redisClient.on('connect', () => {
      onReadyCb();

      // Synchronize config
      const [key, field] = keys.buildInitKey().split('::');
      const value = JSON.stringify({ t: getTelemetryConfigStats(mode, STORAGE_REDIS) });
      redisClient.hset(key, field, value).catch(() => { /* Handle rejections for telemetry */ });
    });

    return {
      splits: new SplitsCacheInRedis(log, keys, redisClient),
      segments: new SegmentsCacheInRedis(log, keys, redisClient),
      impressions: new ImpressionsCacheInRedis(log, keys.buildImpressionsKey(), redisClient, metadata),
      events: new EventsCacheInRedis(log, keys.buildEventsKey(), redisClient, metadata),
      telemetry: new TelemetryCacheInRedis(log, keys, redisClient),

      // When using REDIS we should:
      // 1- Disconnect from the storage
      destroy() {
        redisClient.disconnect();
        // @TODO check that caches works as expected when redisClient is disconnected
      }
    };
  }

  InRedisStorageFactory.type = STORAGE_REDIS;
  return InRedisStorageFactory;
}
