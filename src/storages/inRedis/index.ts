import type { RedisAdapter } from './RedisAdapter';
import { IStorageAsync, IStorageAsyncFactory, IStorageFactoryParams } from '../types';
import { validatePrefix } from '../KeyBuilder';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { SplitsCacheInRedis } from './SplitsCacheInRedis';
import { SegmentsCacheInRedis } from './SegmentsCacheInRedis';
import { ImpressionsCacheInRedis } from './ImpressionsCacheInRedis';
import { EventsCacheInRedis } from './EventsCacheInRedis';
import { DEBUG, NONE, STORAGE_REDIS } from '../../utils/constants';
import { TelemetryCacheInRedis } from './TelemetryCacheInRedis';
import { UniqueKeysCacheInRedis } from './UniqueKeysCacheInRedis';
import { ImpressionCountsCacheInRedis } from './ImpressionCountsCacheInRedis';
import { metadataBuilder } from '../utils';

export interface InRedisStorageOptions {
  prefix?: string
  options?: Record<string, any>
}

/**
 * InRedis storage factory for consumer server-side SplitFactory, that uses `Ioredis` Redis client for Node.
 * @see {@link https://www.npmjs.com/package/ioredis}
 */
export function InRedisStorage(options: InRedisStorageOptions = {}): IStorageAsyncFactory {

  // Lazy loading to prevent error when bundling or importing the SDK in a .mjs file, since ioredis is a CommonJS module.
  // Redis storage is not supported with .mjs files.
  const RD = require('./RedisAdapter').RedisAdapter;

  const prefix = validatePrefix(options.prefix);

  function InRedisStorageFactory(params: IStorageFactoryParams): IStorageAsync {
    const { onReadyCb, settings, settings: { log, sync: { impressionsMode } } } = params;
    const metadata = metadataBuilder(settings);
    const keys = new KeyBuilderSS(prefix, metadata);
    const redisClient: RedisAdapter = new RD(log, options.options || {});
    const telemetry = new TelemetryCacheInRedis(log, keys, redisClient);
    const impressionCountsCache = impressionsMode !== DEBUG ? new ImpressionCountsCacheInRedis(log, keys.buildImpressionsCountKey(), redisClient) : undefined;
    const uniqueKeysCache = impressionsMode === NONE ? new UniqueKeysCacheInRedis(log, keys.buildUniqueKeysKey(), redisClient) : undefined;

    // subscription to Redis connect event in order to emit SDK_READY event on consumer mode
    redisClient.on('connect', () => {
      onReadyCb();
      if (impressionCountsCache) impressionCountsCache.start();
      if (uniqueKeysCache) uniqueKeysCache.start();

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
        let promises = [];
        if (impressionCountsCache) promises.push(impressionCountsCache.stop());
        if (uniqueKeysCache) promises.push(uniqueKeysCache.stop());
        return Promise.all(promises).then(() => { redisClient.disconnect(); });
        // @TODO check that caches works as expected when redisClient is disconnected
      }
    };
  }

  InRedisStorageFactory.type = STORAGE_REDIS;
  return InRedisStorageFactory;
}
