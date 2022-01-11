/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { isNaNNumber } from '../../utils/lang';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { IPluggableStorageWrapper, ISegmentsCacheAsync } from '../types';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';
import { _Set } from '../../utils/lang/sets';

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
   * Add a list of `segmentKeys` to the given segment `name`.
   * The returned promise is resolved when the operation success
   * or rejected if wrapper operation fails.
   */
  addToSegment(name: string, segmentKeys: string[]) {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    if (segmentKeys.length) {
      return this.wrapper.addItems(segmentKey, segmentKeys);
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Remove a list of `segmentKeys` from the given segment `name`.
   * The returned promise is resolved when the operation success
   * or rejected if wrapper operation fails.
   */
  removeFromSegment(name: string, segmentKeys: string[]) {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    if (segmentKeys.length) {
      return this.wrapper.removeItems(segmentKey, segmentKeys);
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Returns a promise that resolves with a boolean value indicating if `key` is part of `name` segment.
   * Promise can be rejected if wrapper operation fails.
   */
  isInSegment(name: string, key: string) {
    return this.wrapper.itemContains(this.keys.buildSegmentNameKey(name), key);
  }

  /**
   * Set till number for the given segment `name`.
   * The returned promise is resolved when the operation success,
   * or rejected if it fails (e.g., wrapper operation fails).
   */
  setChangeNumber(name: string, changeNumber: number) {
    return this.wrapper.set(
      this.keys.buildSegmentTillKey(name), changeNumber + ''
    );
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

  /** @TODO implement if required by DataLoader or Producer mode  */
  clear(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
