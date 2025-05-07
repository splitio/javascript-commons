import type { RedisAdapter } from './RedisAdapter';
import { IStorageAsync, IStorageAsyncFactory, IStorageFactoryParams } from '../types';
import { validatePrefix } from '../KeyBuilder';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { SplitsCacheInRedis } from './SplitsCacheInRedis';
import { SegmentsCacheInRedis } from './SegmentsCacheInRedis';
import { ImpressionsCacheInRedis } from './ImpressionsCacheInRedis';
import { EventsCacheInRedis } from './EventsCacheInRedis';
import { STORAGE_REDIS } from '../../utils/constants';
import { TelemetryCacheInRedis } from './TelemetryCacheInRedis';
import { UniqueKeysCacheInRedis } from './UniqueKeysCacheInRedis';
import { ImpressionCountsCacheInRedis } from './ImpressionCountsCacheInRedis';
import { metadataBuilder } from '../utils';

export interface InRedisStorageOptions {
  prefix?: string
  options?: Record<string, any>
}

let RD: typeof RedisAdapter | undefined;

try {
  // Using `require` to prevent error when bundling or importing the SDK in a .mjs file, since ioredis is a CommonJS module.
  // Redis storage is not supported with .mjs files.
  RD = require('./RedisAdapter').RedisAdapter;
} catch (error) { /* empty */ }

/**
 * InRedis storage factory for consumer server-side SplitFactory, that uses `Ioredis` Redis client for Node.js
 * @see {@link https://www.npmjs.com/package/ioredis}
 */
export function InRedisStorage(options: InRedisStorageOptions = {}): IStorageAsyncFactory {

  const prefix = validatePrefix(options.prefix);

  function InRedisStorageFactory(params: IStorageFactoryParams): IStorageAsync {
    if (!RD) throw new Error('Redis storage is not available. Runtime environment must support CommonJS (`require`) to import the ioredis dependency.');

    const { onReadyCb, settings, settings: { log } } = params;
    const metadata = metadataBuilder(settings);
    const keys = new KeyBuilderSS(prefix, metadata);
    const redisClient = new RD(log, options.options || {});
    const telemetry = new TelemetryCacheInRedis(log, keys, redisClient);
    const impressionCountsCache = new ImpressionCountsCacheInRedis(log, keys.buildImpressionsCountKey(), redisClient);
    const uniqueKeysCache = new UniqueKeysCacheInRedis(log, keys.buildUniqueKeysKey(), redisClient);

    // subscription to Redis connect event in order to emit SDK_READY event on consumer mode
    redisClient.on('connect', () => {
      onReadyCb();
      impressionCountsCache.start();
      uniqueKeysCache.start();

      // Synchronize config
      telemetry.recordConfig();
    });

    return {
      splits: new SplitsCacheInRedis(log, keys, redisClient, settings.sync.__splitFiltersValidation),
      segments: new SegmentsCacheInRedis(log, keys, redisClient),
      impressions: new ImpressionsCacheInRedis(log, keys.buildImpressionsKey(), redisClient, metadata),
      impressionCounts: impressionCountsCache,
      events: new EventsCacheInRedis(log, keys.buildEventsKey(), redisClient, metadata),
      telemetry,
      uniqueKeys: uniqueKeysCache,

      // When using REDIS we should:
      // 1- Disconnect from the storage
      destroy(): Promise<void> {
        return Promise.all([
          impressionCountsCache.stop(),
          uniqueKeysCache.stop()
        ]).then(() => { redisClient.disconnect(); });
        // @TODO check that caches works as expected when redisClient is disconnected
      }
    };
  }

  InRedisStorageFactory.type = STORAGE_REDIS;
  return InRedisStorageFactory;
}
