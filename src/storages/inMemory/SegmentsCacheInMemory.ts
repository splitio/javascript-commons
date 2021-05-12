import AbstractSegmentsCacheSync from '../AbstractSegmentsCacheSync';
import { ISet, _Set } from '../../utils/lang/sets';
import { isIntegerNumber } from '../../utils/lang';
import { ISplitsCacheSync } from '../types';
import { getRegisteredSegments } from '../getRegisteredSegments';

/**
 * Default ISplitsCacheSync implementation that stores split definitions in memory.
 * Supported by all JS runtimes.
 */
export default class SegmentsCacheInMemory extends AbstractSegmentsCacheSync {

  private segmentCache: Record<string, ISet<string>> = {};
  private segmentChangeNumber: Record<string, number> = {};
  private readonly splits: ISplitsCacheSync;

  constructor(splits: ISplitsCacheSync) {
    super();
    this.splits = splits;
  }

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

  getRegisteredSegments() {
    return getRegisteredSegments(this.splits.getAll());
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
