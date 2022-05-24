/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { ISegmentsCacheSync } from './types';

/**
 * This class provides a skeletal implementation of the ISegmentsCacheSync interface
 * to minimize the effort required to implement this interface.
 */
export abstract class AbstractSegmentsCacheSync implements ISegmentsCacheSync {
  /**
   * For server-side synchronizer: add `segmentKeys` list of keys to `name` segment.
   * For client-side synchronizer: add `name` segment to the cache. `segmentKeys` is undefined.
   */
  abstract addToSegment(name: string, segmentKeys?: string[]): boolean

  /**
   * For server-side synchronizer: remove `segmentKeys` list of keys from `name` segment.
   * For client-side synchronizer: remove `name` segment from the cache. `segmentKeys` is undefined.
   */
  abstract removeFromSegment(name: string, segmentKeys?: string[]): boolean

  /**
   * For server-side synchronizer: check if `key` is in `name` segment.
   * For client-side synchronizer: check if `name` segment is in the cache. `key` is undefined.
   */
  abstract isInSegment(name: string, key?: string): boolean

  /**
   * clear the cache.
   */
  abstract clear(): void

  /**
   * For server-side synchronizer: add the given list of segments to the cache, with an empty list of keys. The segments that already exist are not modified.
   * For client-side synchronizer: the method is not used.
   */
  registerSegments(names: string[]): boolean { return false; }

  /**
   * For server-side synchronizer: get the list of segments to fetch changes.
   * Also used for the `seC` (segment count) telemetry stat.
   */
  abstract getRegisteredSegments(): string[]

  /**
   * Only used for the `skC`(segment keys count) telemetry stat: 1 for client-side, and total count of keys in server-side.
   */
  abstract getKeysCount(): number

  /**
   * For server-side synchronizer: set the change number of `name` segment.
   * For client-side synchronizer: the method is not used.
   */
  setChangeNumber(name: string, changeNumber: number): boolean { return true; }

  /**
   * For server-side synchronizer: get the change number of `name` segment.
   * For client-side synchronizer: the method is not used.
   */
  getChangeNumber(name: string): number { return -1; }

  /**
   * For server-side synchronizer: the method is not used.
   * For client-side synchronizer: reset the cache with the given list of segments.
   */
  resetSegments(names: string[]): boolean { return true; }
}
