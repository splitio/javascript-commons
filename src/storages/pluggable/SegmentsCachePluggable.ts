/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { isNaNNumber } from '../../utils/lang';
import KeyBuilder from '../KeyBuilder';
import { ICustomStorageWrapper, ISegmentsCacheAsync } from '../types';
import { ILogger } from '../../logger/types';
import { logPrefix } from './constants';

/**
 * ISegmentsCacheAsync implementation for pluggable storages.
 */
export class SegmentsCachePluggable implements ISegmentsCacheAsync {

  private readonly log: ILogger;
  private readonly keys: KeyBuilder;
  private readonly wrapper: ICustomStorageWrapper;

  constructor(log: ILogger, keys: KeyBuilder, wrapper: ICustomStorageWrapper) {
    this.log = log;
    this.keys = keys;
    this.wrapper = wrapper;
  }

  /**
   * Returns if `key` is part of `name` segment.
   */
  isInSegment(name: string, key: string) {
    return this.wrapper.itemContains(this.keys.buildSegmentNameKey(name), key);
  }

  /**
   * Set till number for the given segment `name`.
   * The returned promise is resolved when the operation success,
   * or rejected with an SplitError if it fails (e.g., wrapper operation fails).
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
      this.log.error(logPrefix + 'Could not retrieve changeNumber from segments storage. Error: ' + e);
      return -1;
    });
  }

  /**
   * Add a list of `segmentKeys` to the given segment `name`.
   * The returned promise is resolved when the operation success
   * or rejected with an SplitError if it fails (e.g., wrapper operation fails, JSON parsing error)
   *
   * @TODO implement for DataLoader/Producer mode
   */
  addToSegment(name: string, segmentKeys: string[]) {
    return Promise.resolve(true);
  }

  /**
   * Remove a list of `segmentKeys` from the given segment `name`.
   * The returned promise is resolved when the operation success
   * or rejected with an SplitError if it fails (e.g., wrapper operation fails, JSON parsing error)
   *
   * @TODO implement for DataLoader/Producer mode
   */
  removeFromSegment(name: string, segmentKeys: string[]) {
    return Promise.resolve(true);
  }

  /** @TODO implement for DataLoader/Producer mode  */
  registerSegments(names: string[]) {
    return Promise.resolve(true);
  }

  /** @TODO implement for DataLoader/Producer mode  */
  getRegisteredSegments() {
    return Promise.resolve([]);
  }

  /** @TODO implement for DataLoader/Producer mode  */
  clear(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
