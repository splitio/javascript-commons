import { AbstractSegmentsCacheSync } from '../AbstractSegmentsCacheSync';

/**
 * Default MySegmentsCacheInMemory implementation that stores MySegments in memory.
 * Supported by all JS runtimes.
 */
export class MySegmentsCacheInMemory extends AbstractSegmentsCacheSync {

  private segmentCache: Record<string, boolean> = {};
  private cn?: number;

  addToSegment(name: string): boolean {
    this.segmentCache[name] = true;

    return true;
  }

  removeFromSegment(name: string): boolean {
    delete this.segmentCache[name];

    return true;
  }

  isInSegment(name: string): boolean {
    return this.segmentCache[name] === true;
  }


  setChangeNumber(name?: string, changeNumber?: number) {
    this.cn = changeNumber;
  }
  getChangeNumber() {
    return this.cn || -1;
  }

  getRegisteredSegments() {
    return Object.keys(this.segmentCache);
  }

  getKeysCount() {
    return 1;
  }

}
