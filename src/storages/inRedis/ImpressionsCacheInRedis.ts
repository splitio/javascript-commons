import { IImpressionsCacheAsync } from '../types';
import { IMetadata } from '../../dtos/types';
import { ImpressionDTO } from '../../types';
import KeyBuilderSS from '../KeyBuilderSS';
import { Redis } from 'ioredis';

export default class ImpressionsCacheInRedis implements IImpressionsCacheAsync {

  private readonly redis: Redis;
  private readonly keys: KeyBuilderSS;
  private readonly metadata: IMetadata;

  constructor(keys: KeyBuilderSS, redis: Redis, metadata: IMetadata) {
    this.keys = keys;
    this.redis = redis;
    this.metadata = metadata;
  }

  track(impressions: ImpressionDTO[]): Promise<boolean> {
    return this.redis.rpush(
      this.keys.buildImpressionsKey(),
      this._toJSON(impressions)
    ).then(queuedCount => {
      // If this is the creation of the key on Redis, set the expiration for it in 1hr.
      if (queuedCount === impressions.length) {
        return this.redis.expire(this.keys.buildImpressionsKey(), 3600).then(result => result === 1); // 1 if the timeout was set. 0 if key does not exist.
      }
      return true;
    });
  }

  private _toJSON(impressions: ImpressionDTO[]): string[] {
    return impressions.map(impression => {
      const {
        keyName, bucketingKey, feature, treatment, label, time, changeNumber
      } = impression;

      return JSON.stringify({
        m: this.metadata,
        i: {
          k: keyName,
          b: bucketingKey,
          f: feature,
          t: treatment,
          r: label,
          c: changeNumber,
          m: time
        }
      });
    });
  }

}
