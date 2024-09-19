import { ILogger } from '../../logger/types';
import { isNaNNumber } from '../../utils/lang';
import { LOG_PREFIX } from '../inLocalStorage/constants';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { ISegmentsCacheAsync } from '../types';
import type { RedisAdapter } from './RedisAdapter';

export class SegmentsCacheInRedis implements ISegmentsCacheAsync {

  private readonly log: ILogger;
  private readonly redis: RedisAdapter;
  private readonly keys: KeyBuilderSS;

  constructor(log: ILogger, keys: KeyBuilderSS, redis: RedisAdapter) {
    this.log = log;
    this.redis = redis;
    this.keys = keys;
  }

  /**
   * Update the given segment `name` with the lists of `addedKeys`, `removedKeys` and `changeNumber`.
   * The returned promise is resolved if the operation success, with `true` if the segment was updated (i.e., some key was added or removed),
   * or rejected if it fails (e.g., Redis operation fails).
   */
  update(name: string, addedKeys: string[], removedKeys: string[], changeNumber: number) {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    return Promise.all([
      addedKeys.length && this.redis.sadd(segmentKey, addedKeys),
      removedKeys.length && this.redis.srem(segmentKey, removedKeys),
      this.redis.set(this.keys.buildSegmentTillKey(name), changeNumber + '')
    ]).then(() => {
      return addedKeys.length > 0 || removedKeys.length > 0;
    });
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

  // @TODO remove or implement. It is not being used.
  clear() {
    return Promise.resolve();
  }
}
