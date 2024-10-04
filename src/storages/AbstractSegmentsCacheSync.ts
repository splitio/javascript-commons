/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { IMySegmentsResponse } from '../dtos/types';
import { MySegmentsData } from '../sync/polling/types';
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
  clear() {
    this.resetSegments({});
  }

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
   * @TODO for client-side it should be the number of clients, but it requires a refactor of MySegments caches to simplify the code.
   */
  abstract getKeysCount(): number

  /**
   * For server-side synchronizer: change number of `name` segment.
   * For client-side synchronizer: change number of mySegments.
   */
  abstract setChangeNumber(name?: string, changeNumber?: number): boolean | void
  abstract getChangeNumber(name: string): number

  /**
   * For server-side synchronizer: the method is not used.
   * For client-side synchronizer: it resets or updates the cache.
   */
  resetSegments(segmentsData: MySegmentsData | IMySegmentsResponse): boolean {
    this.setChangeNumber(undefined, segmentsData.cn);

    const { added, removed } = segmentsData as MySegmentsData;

    if (added && removed) {
      let isDiff = false;

      added.forEach(segment => {
        isDiff = this.addToSegment(segment) || isDiff;
      });

      removed.forEach(segment => {
        isDiff = this.removeFromSegment(segment) || isDiff;
      });

      return isDiff;
    }

    const names = ((segmentsData as IMySegmentsResponse).k || []).map(s => s.n).sort();
    const storedSegmentKeys = this.getRegisteredSegments().sort();

    // Extreme fast => everything is empty
    if (!names.length && !storedSegmentKeys.length) return false;

    let index = 0;

    while (index < names.length && index < storedSegmentKeys.length && names[index] === storedSegmentKeys[index]) index++;

    // Quick path => no changes
    if (index === names.length && index === storedSegmentKeys.length) return false;

    // Slowest path => add and/or remove segments
    for (let removeIndex = index; removeIndex < storedSegmentKeys.length; removeIndex++) {
      this.removeFromSegment(storedSegmentKeys[removeIndex]);
    }

    for (let addIndex = index; addIndex < names.length; addIndex++) {
      this.addToSegment(names[addIndex]);
    }

    return true;
  }
}
