import { IImpressionsCacheAsync } from '../types';
import { IMetadata } from '../../dtos/types';
import { ImpressionDTO } from '../../types';
import { Redis } from 'ioredis';
import { StoredImpressionWithMetadata } from '../../sync/submitters/types';
import { ILogger } from '../../logger/types';
import { impressionsToJSON } from '../utils';

const IMPRESSIONS_TTL_REFRESH = 3600; // 1 hr

export class ImpressionsCacheInRedis implements IImpressionsCacheAsync {

  private readonly log: ILogger;
  private readonly key: string;
  private readonly redis: Redis;
  private readonly metadata: IMetadata;

  constructor(log: ILogger, key: string, redis: Redis, metadata: IMetadata) {
    this.log = log;
    this.key = key;
    this.redis = redis;
    this.metadata = metadata;
  }

  track(impressions: ImpressionDTO[]): Promise<void> { // @ts-ignore
    return this.redis.rpush(
      this.key,
      impressionsToJSON(impressions, this.metadata),
    ).then(queuedCount => {
      // If this is the creation of the key on Redis, set the expiration for it in 1hr.
      if (queuedCount === impressions.length) {
        return this.redis.expire(this.key, IMPRESSIONS_TTL_REFRESH);
      }
    });
  }

  count(): Promise<number> {
    return this.redis.llen(this.key).catch(() => 0);
  }

  drop(count?: number): Promise<any> {
    if (!count) return this.redis.del(this.key);

    return this.redis.ltrim(this.key, count, -1);
  }

  popNWithMetadata(count: number): Promise<StoredImpressionWithMetadata[]> {
    return this.redis.lrange(this.key, 0, count - 1).then(items => {
      return this.redis.ltrim(this.key, items.length, -1).then(() => {
        // This operation will simply do nothing if the key no longer exists (queue is empty)
        // It's only done in the "successful" exit path so that the TTL is not overriden if impressons weren't
        // popped correctly. This will result in impressions getting lost but will prevent the queue from taking
        // a huge amount of memory.
        this.redis.expire(this.key, IMPRESSIONS_TTL_REFRESH).catch(() => { }); // noop catch handler

        return items.map(item => JSON.parse(item) as StoredImpressionWithMetadata);
      });
    });
  }

}
