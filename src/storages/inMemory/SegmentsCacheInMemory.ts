import { isIntegerNumber } from '../../utils/lang';
import { ISegmentsCacheSync } from '../types';

/**
 * Default ISplitsCacheSync implementation for server-side that stores segments definitions in memory.
 */
export class SegmentsCacheInMemory implements ISegmentsCacheSync {

  private segmentCache: Record<string, Set<string>> = {};
  private segmentChangeNumber: Record<string, number> = {};

  update(name: string, addedKeys: string[], removedKeys: string[], changeNumber: number) {
    const keySet = this.segmentCache[name] || new Set<string>();

    addedKeys.forEach(k => keySet.add(k));
    removedKeys.forEach(k => keySet.delete(k));

    this.segmentCache[name] = keySet;
    this.segmentChangeNumber[name] = changeNumber;

    return addedKeys.length > 0 || removedKeys.length > 0;
  }

  isInSegment(name: string, key: string): boolean {
    const segmentValues = this.segmentCache[name];

    if (segmentValues) {
      return segmentValues.has(key);
    }

    return false;
  }

  clear() {
    this.segmentCache = {};
    this.segmentChangeNumber = {};
  }

  private _registerSegment(name: string) {
    if (!this.segmentCache[name]) {
      this.segmentCache[name] = new Set<string>();
    }

    return true;
  }

  registerSegments(names: string[]) {
    for (let i = 0; i < names.length; i++) {
      this._registerSegment(names[i]);
    }

    return true;
  }

  getRegisteredSegments() {
    return Object.keys(this.segmentCache);
  }

  getKeysCount() {
    return Object.keys(this.segmentCache).reduce((acum, segmentName) => {
      return acum + this.segmentCache[segmentName].size;
    }, 0);
  }

  getChangeNumber(name: string) {
    const value = this.segmentChangeNumber[name];

    return isIntegerNumber(value) ? value : undefined;
  }

  // No-op. Not used in server-side
  resetSegments() { return false; }

}
