/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { isNaNNumber } from '../../utils/lang';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { IPluggableStorageWrapper, ISegmentsCacheAsync } from '../types';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';

/**
 * ISegmentsCacheAsync implementation for pluggable storages.
 */
export class SegmentsCachePluggable implements ISegmentsCacheAsync {

  private readonly log: ILogger;
  private readonly keys: KeyBuilderSS;
  private readonly wrapper: IPluggableStorageWrapper;

  constructor(log: ILogger, keys: KeyBuilderSS, wrapper: IPluggableStorageWrapper) {
    this.log = log;
    this.keys = keys;
    this.wrapper = wrapper;
  }

  /**
   * Update the given segment `name` with the lists of `addedKeys`, `removedKeys` and `changeNumber`.
   * The returned promise is resolved if the operation success, with `true` if the segment was updated (i.e., some key was added or removed),
   * or rejected if it fails (e.g., wrapper operation fails).
   */
  update(name: string, addedKeys: string[], removedKeys: string[], changeNumber: number) {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    return Promise.all<any>([
      addedKeys.length && this.wrapper.addItems(segmentKey, addedKeys),
      removedKeys.length && this.wrapper.removeItems(segmentKey, removedKeys),
      this.wrapper.set(this.keys.buildSegmentTillKey(name), changeNumber + '')
    ]).then(() => {
      return addedKeys.length > 0 || removedKeys.length > 0;
    });
  }

  /**
   * Returns a promise that resolves with a boolean value indicating if `key` is part of `name` segment.
   * Promise can be rejected if wrapper operation fails.
   */
  isInSegment(name: string, key: string) {
    return this.wrapper.itemContains(this.keys.buildSegmentNameKey(name), key);
  }

  /**
   * Get till number or -1 if it's not defined.
   * The returned promise is resolved with the changeNumber or -1 if it doesn't exist or a wrapper operation fails.
   * The promise will never be rejected.
   */
  getChangeNumber(name: string) {
    return this.wrapper.get(this.keys.buildSegmentTillKey(name)).then((value: string | null) => {
      const i = parseInt(value as string, 10);

      return isNaNNumber(i) ? -1 : i;
    }).catch((e) => {
      this.log.error(LOG_PREFIX + 'Could not retrieve changeNumber from segments storage. Error: ' + e);
      return -1;
    });
  }

  /**
   * Add the given segment names to the set of registered segments.
   * The returned promise is resolved when the operation success,
   * or rejected if it fails (e.g., wrapper operation fails).
   */
  registerSegments(segments: string[]) {
    if (segments.length) {
      return this.wrapper.addItems(this.keys.buildRegisteredSegmentsKey(), segments);
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Returns a promise that resolves with the set of registered segments in a list,
   * or rejected if it fails (e.g., wrapper operation fails).
   */
  getRegisteredSegments() {
    return this.wrapper.getItems(this.keys.buildRegisteredSegmentsKey());
  }

  // @TODO implement if required by DataLoader or Producer mode
  clear(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
