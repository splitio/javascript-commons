import { IEventsCacheAsync } from '../types';
import { IMetadata } from '../../dtos/types';
import { Redis } from 'ioredis';
import { SplitIO } from '../../types';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';
import { StoredEventWithMetadata } from '../../sync/submitters/types';

export class EventsCacheInRedis implements IEventsCacheAsync {

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

  /**
   * Add a new event object into the queue.
   * Unlike `impressions::track`, result promise is never rejected.
   */
  track(eventData: SplitIO.EventData): Promise<boolean> {
    return this.redis.rpush(
      this.key,
      this._toJSON(eventData)
    )
      // We use boolean values to signal successful queueing
      .then(() => true)
      .catch(err => {
        this.log.error(`${LOG_PREFIX}Error adding event to queue: ${err}.`);
        return false;
      });
  }

  /**
   * Generates the JSON as we'll store it on Redis.
   */
  private _toJSON(eventData: SplitIO.EventData): string {
    return JSON.stringify({
      m: this.metadata,
      e: eventData
    } as StoredEventWithMetadata);
  }

  count(): Promise<number> {
    return this.redis.llen(this.key).catch(() => 0);
  }

  drop(count?: number): Promise<any> {
    if (!count) return this.redis.del(this.key);

    return this.redis.ltrim(this.key, count, -1);
  }

  /**
   * Pop the given number of events from the storage.
   * The returned promise rejects if the redis operation fails.
   *
   * NOTE: this method doesn't take into account MAX_EVENT_SIZE or MAX_QUEUE_BYTE_SIZE limits.
   * It is the submitter responsability to handle that.
   */
  popNWithMetadata(count: number): Promise<StoredEventWithMetadata[]> {
    return this.redis.lrange(this.key, 0, count - 1).then(items => {
      return this.redis.ltrim(this.key, items.length, -1).then(() => {
        return items.map(item => JSON.parse(item) as StoredEventWithMetadata);
      });
    });
  }

}
