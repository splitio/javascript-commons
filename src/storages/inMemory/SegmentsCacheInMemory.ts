import { AbstractSegmentsCacheSync } from '../AbstractSegmentsCacheSync';
import { ISet, _Set } from '../../utils/lang/sets';
import { isIntegerNumber } from '../../utils/lang';

/**
 * Default ISplitsCacheSync implementation that stores split definitions in memory.
 * Supported by all JS runtimes.
 */
export class SegmentsCacheInMemory extends AbstractSegmentsCacheSync {

  private segmentCache: Record<string, ISet<string>> = {};
  private segmentChangeNumber: Record<string, number> = {};

  addToSegment(name: string, segmentKeys: string[]): boolean {
    const values = this.segmentCache[name];
    const keySet = values ? values : new _Set<string>();

    segmentKeys.forEach(k => keySet.add(k));

    this.segmentCache[name] = keySet;

    return true;
  }

  removeFromSegment(name: string, segmentKeys: string[]): boolean {
    const values = this.segmentCache[name];
    const keySet = values ? values : new _Set<string>();

    segmentKeys.forEach(k => keySet.delete(k));

    this.segmentCache[name] = keySet;

    return true;
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
      this.segmentCache[name] = new _Set<string>();
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

  setChangeNumber(name: string, changeNumber: number) {
    this.segmentChangeNumber[name] = changeNumber;

    return true;
  }

  getChangeNumber(name: string) {
    const value = this.segmentChangeNumber[name];

    return isIntegerNumber(value) ? value : -1;
  }

}
