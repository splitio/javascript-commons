import { IEventsCacheAsync } from '../types';
import { IRedisMetadata } from '../../dtos/types';
import KeyBuilderSS from '../KeyBuilderSS';
import { Redis } from 'ioredis';
import { SplitIO } from '../../types';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';

export default class EventsCacheInRedis implements IEventsCacheAsync {

  private readonly redis: Redis;
  private readonly keys: KeyBuilderSS;
  private readonly metadata: IRedisMetadata;
  private readonly eventsKey: string;

  constructor(private readonly log: ILogger, keys: KeyBuilderSS, redis: Redis, metadata: IRedisMetadata) {
    this.keys = keys;
    this.redis = redis;
    this.metadata = metadata;

    this.eventsKey = keys.buildEventsKey();
  }

  /**
   * Add a new event object into the queue.
   */
  track(eventData: SplitIO.EventData): Promise<boolean> {
    return this.redis.rpush(
      this.eventsKey,
      this._toJSON(eventData)
    )
      // We use boolean values to signal successful queueing
      .then(() => true)
      .catch(err => {
        this.log.error(LOG_PREFIX + `Error adding event to queue: ${err}.`);
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
    });
  }

}
