import { Redis } from 'ioredis';
import { isNaNNumber } from '../../utils/lang';
import KeyBuilderSS from '../KeyBuilderSS';
import { ISegmentsCacheAsync } from '../types';

export default class SegmentsCacheInRedis implements ISegmentsCacheAsync {

  private readonly redis: Redis;
  private readonly keys: KeyBuilderSS;

  constructor(keys: KeyBuilderSS, redis: Redis) {
    this.redis = redis;
    this.keys = keys;
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
    });
  }

  // @TODO remove: not used and not part of interface
  registerSegment(segment: string) {
    return this.registerSegments([segment]);
  }

  registerSegments(segments: string[]) {
    if (segments.length) {
      return this.redis.sadd(this.keys.buildRegisteredSegmentsKey(), segments).then(() => true);
    } else {
      return Promise.resolve(true);
    }
  }

  getRegisteredSegments() {
    return this.redis.smembers(this.keys.buildRegisteredSegmentsKey());
  }

  clear() {
    return this.redis.flushdb().then(status => status === 'OK');
  }
}
