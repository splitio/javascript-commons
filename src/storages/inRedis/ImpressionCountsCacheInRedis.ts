import { Redis } from 'ioredis';
import { ILogger } from '../../logger/types';
import { ImpressionCountsPayload } from '../../sync/submitters/types';
import { forOwn } from '../../utils/lang';
import { ImpressionCountsCacheInMemory } from '../inMemory/ImpressionCountsCacheInMemory';
import { LOG_PREFIX, REFRESH_RATE, TTL_REFRESH } from './constants';

export class ImpressionCountsCacheInRedis extends ImpressionCountsCacheInMemory {

  private readonly log: ILogger;
  private readonly key: string;
  private readonly redis: Redis;
  private readonly refreshRate: number;
  private intervalId: any;

  constructor(log: ILogger, key: string, redis: Redis, impressionCountsCacheSize?: number, refreshRate = REFRESH_RATE) {
    super(impressionCountsCacheSize);
    this.log = log;
    this.key = key;
    this.redis = redis;
    this.refreshRate = refreshRate;
    this.onFullQueue = () => { this.postImpressionCountsInRedis(); };
  }

  private postImpressionCountsInRedis() {
    const counts = this.pop();
    const keys = Object.keys(counts);
    if (!keys.length) return Promise.resolve(false);

    const pipeline = this.redis.pipeline();
    keys.forEach(key => {
      pipeline.hincrby(this.key, key, counts[key]);
    });
    return pipeline.exec()
      .then(data => {
        // If this is the creation of the key on Redis, set the expiration for it in 3600 seconds.
        if (data.length && data.length === keys.length) {
          return this.redis.expire(this.key, TTL_REFRESH);
        }
      })
      .catch(err => {
        this.log.error(`${LOG_PREFIX}Error in impression counts pipeline: ${err}.`);
        return false;
      });
  }

  start() {
    this.intervalId = setInterval(this.postImpressionCountsInRedis.bind(this), this.refreshRate);
  }

  stop() {
    clearInterval(this.intervalId);
    return this.postImpressionCountsInRedis();
  }

  // Async consumer API, used by synchronizer
  getImpressionsCount(): Promise<ImpressionCountsPayload | undefined> {
    return this.redis.hgetall(this.key)
      .then(counts => {
        if (!Object.keys(counts).length) return undefined;

        this.redis.del(this.key).catch(() => { /* no-op */ });

        const pf: ImpressionCountsPayload['pf'] = [];

        forOwn(counts, (count, key) => {
          const nameAndTime = key.split('::');
          if (nameAndTime.length !== 2) {
            this.log.error(`${LOG_PREFIX}Error spliting key ${key}`);
            return;
          }

          const timeFrame = parseInt(nameAndTime[1]);
          if (isNaN(timeFrame)) {
            this.log.error(`${LOG_PREFIX}Error parsing time frame ${nameAndTime[1]}`);
            return;
          }

          const rawCount = parseInt(count);
          if (isNaN(rawCount)) {
            this.log.error(`${LOG_PREFIX}Error parsing raw count ${count}`);
            return;
          }

          pf.push({
            f: nameAndTime[0],
            m: timeFrame,
            rc: rawCount,
          });
        });

        return { pf };
      });
  }
}
