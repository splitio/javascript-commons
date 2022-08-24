import { RedisAdapter } from './RedisAdapter';
import { IStorageAsync, IStorageFactoryParams } from '../types';
import { StorageAsyncFactory } from '../../types';
import { validatePrefix } from '../KeyBuilder';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { SplitsCacheInRedis } from './SplitsCacheInRedis';
import { SegmentsCacheInRedis } from './SegmentsCacheInRedis';
import { ImpressionsCacheInRedis } from './ImpressionsCacheInRedis';
import { EventsCacheInRedis } from './EventsCacheInRedis';
import { STORAGE_REDIS } from '../../utils/constants';
import { TelemetryCacheInRedis } from './TelemetryCacheInRedis';

export interface InRedisStorageOptions {
  prefix?: string
  options?: Record<string, any>
}

/**
 * InRedis storage factory for consumer server-side SplitFactory, that uses `Ioredis` Redis client for Node.
 * @see {@link https://www.npmjs.com/package/ioredis}
 */
export function InRedisStorage(options: InRedisStorageOptions = {}): StorageAsyncFactory {

  const prefix = validatePrefix(options.prefix);

  function InRedisStorageFactory({ log, metadata, onReadyCb }: IStorageFactoryParams): IStorageAsync {

    const keys = new KeyBuilderSS(prefix, metadata);
    const redisClient = new RedisAdapter(log, options.options || {});
    const telemetry = new TelemetryCacheInRedis(log, keys, redisClient);

    // subscription to Redis connect event in order to emit SDK_READY event on consumer mode
    redisClient.on('connect', () => {
      onReadyCb();

      // Synchronize config
      telemetry.recordConfig();
    });

    return {
      splits: new SplitsCacheInRedis(log, keys, redisClient),
      segments: new SegmentsCacheInRedis(log, keys, redisClient),
      impressions: new ImpressionsCacheInRedis(log, keys.buildImpressionsKey(), redisClient, metadata),
      events: new EventsCacheInRedis(log, keys.buildEventsKey(), redisClient, metadata),
      telemetry,

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
