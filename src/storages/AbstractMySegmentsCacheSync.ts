import { IMySegmentsResponse } from '../dtos/types';
import { MySegmentsData } from '../sync/polling/types';
import { ISegmentsCacheSync } from './types';

/**
 * This class provides a skeletal implementation of the ISegmentsCacheSync interface
 * to minimize the effort required to implement this interface.
 */
export abstract class AbstractMySegmentsCacheSync implements ISegmentsCacheSync {

  protected abstract addSegment(name: string): boolean
  protected abstract removeSegment(name: string): boolean
  protected abstract setChangeNumber(changeNumber?: number): boolean | void

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


  // No-op. Not used in client-side.
  registerSegments(): boolean { return false; }
  update() { return false; }

  /**
   * For server-side synchronizer: get the list of segments to fetch changes.
   * Also used for the `seC` (segment count) telemetry stat.
   */
  abstract getRegisteredSegments(): string[]

  /**
   * Only used for the `skC`(segment keys count) telemetry stat: 1 for client-side, and total count of keys in server-side.
   */
  // @TODO for client-side it should be the number of clients, but it requires a refactor of MySegments caches to simplify the code.
  abstract getKeysCount(): number

  abstract getChangeNumber(): number

  /**
   * For server-side synchronizer: the method is not used.
   * For client-side synchronizer: it resets or updates the cache.
   */
  resetSegments(segmentsData: MySegmentsData | IMySegmentsResponse): boolean {
    this.setChangeNumber(segmentsData.cn);

    const { added, removed } = segmentsData as MySegmentsData;

    if (added && removed) {
      let isDiff = false;

      added.forEach(segment => {
        isDiff = this.addSegment(segment) || isDiff;
      });

      removed.forEach(segment => {
        isDiff = this.removeSegment(segment) || isDiff;
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
      this.removeSegment(storedSegmentKeys[removeIndex]);
    }

    for (let addIndex = index; addIndex < names.length; addIndex++) {
      this.addSegment(names[addIndex]);
    }

    return true;
  }
}
