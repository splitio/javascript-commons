import RedisAdapter from './RedisAdapter';
import { IStorageAsync, IStorageFactoryParams } from '../types';
import KeyBuilderSS from '../KeyBuilderSS';
import SplitsCacheInRedis from './SplitsCacheInRedis';
import SegmentsCacheInRedis from './SegmentsCacheInRedis';
import ImpressionsCacheInRedis from './ImpressionsCacheInRedis';
import EventsCacheInRedis from './EventsCacheInRedis';
import LatenciesCacheInRedis from './LatenciesCacheInRedis';
import CountsCacheInRedis from './CountsCacheInRedis';

export interface InRedisStorageOptions {
  prefix?: string
  options?: Record<string, any>
}

/**
 * InRedis storage factory for consumer server-side SplitFactory, that uses `Ioredis` Redis client for Node.
 * @see {@link https://www.npmjs.com/package/ioredis}
 */
export function InRedisStorage(options: InRedisStorageOptions = {}) {

  const prefix = options.prefix ? options.prefix + '.SPLITIO' : 'SPLITIO';

  return function InRedisStorageFactory({ log, metadata, onReadyCb }: IStorageFactoryParams): IStorageAsync {

    const keys = new KeyBuilderSS(prefix, metadata);
    const redisClient = new RedisAdapter(log, options.options || {});

    // subscription to Redis connect event in order to emit SDK_READY event on consumer mode
    redisClient.on('connect', () => {
      if (onReadyCb) onReadyCb();
    });

    return {
      splits: new SplitsCacheInRedis(log, keys, redisClient),
      segments: new SegmentsCacheInRedis(log, keys, redisClient),
      impressions: new ImpressionsCacheInRedis(keys, redisClient, metadata),
      events: new EventsCacheInRedis(log, keys, redisClient, metadata),
      latencies: new LatenciesCacheInRedis(keys, redisClient),
      counts: new CountsCacheInRedis(keys, redisClient),

      // When using REDIS we should:
      // 1- Disconnect from the storage
      destroy() {
        redisClient.disconnect();
        // @TODO check that caches works as expected when redisClient is disconnected
      }
    };
  };
}
