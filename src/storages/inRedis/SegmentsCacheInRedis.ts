import { Redis } from 'ioredis';
import { ILogger } from '../../logger/types';
import { isNaNNumber } from '../../utils/lang';
import KeyBuilderSS from '../KeyBuilderSS';
import { ISegmentsCacheAsync, ISplitsCacheAsync } from '../types';
import { LOG_PREFIX } from './constants';
import { getRegisteredSegments } from '../getRegisteredSegments';

export default class SegmentsCacheInRedis implements ISegmentsCacheAsync {

  private readonly log: ILogger;
  private readonly redis: Redis;
  private readonly keys: KeyBuilderSS;
  private readonly splits: ISplitsCacheAsync;

  constructor(log: ILogger, keys: KeyBuilderSS, redis: Redis, splits: ISplitsCacheAsync) {
    this.log = log;
    this.redis = redis;
    this.keys = keys;
    this.splits = splits;
  }

  addToSegment(name: string, segmentKeys: string[]) {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    if (segmentKeys.length) {
      return this.redis.sadd(segmentKey, segmentKeys).then(() => true);
    } else {
      return Promise.resolve(true);
    }
  }

  removeFromSegment(name: string, segmentKeys: string[]) {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    if (segmentKeys.length) {
      return this.redis.srem(segmentKey, segmentKeys).then(() => true);
    } else {
      return Promise.resolve(true);
    }
  }

  isInSegment(name: string, key: string) {
    return this.redis.sismember(
      this.keys.buildSegmentNameKey(name), key
    ).then(matches => matches !== 0);
  }

  setChangeNumber(name: string, changeNumber: number) {
    return this.redis.set(
      this.keys.buildSegmentTillKey(name), changeNumber + ''
    ).then(status => status === 'OK');
  }

  getChangeNumber(name: string) {
    return this.redis.get(this.keys.buildSegmentTillKey(name)).then((value: string | null) => {
      const i = parseInt(value as string, 10);

      return isNaNNumber(i) ? -1 : i;
    }).catch((e) => {
      this.log.error(LOG_PREFIX + 'Could not retrieve changeNumber from segments storage. Error: ' + e);
      return -1;
    });
  }

  // Segments are computed from splits.
  // We should not register segments using the `PREFIX.segments.registered` key because GO synchronizer is not setting it.
  getRegisteredSegments() {
    return this.splits.getAll().then(getRegisteredSegments);
  }

  // @TODO remove/review. It is not being used.
  clear() {
    return this.redis.flushdb().then(status => status === 'OK');
  }
}
