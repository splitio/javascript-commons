import { AbstractMySegmentsCacheSync } from '../AbstractMySegmentsCacheSync';

/**
 * Default MySegmentsCacheInMemory implementation that stores MySegments in memory.
 * Supported by all JS runtimes.
 */
export class MySegmentsCacheInMemory extends AbstractMySegmentsCacheSync {

  private segmentCache: Record<string, boolean> = {};
  private cn?: number;

  protected addSegment(name: string): boolean {
    if (this.segmentCache[name]) return false;

    this.segmentCache[name] = true;

    return true;
  }

  protected removeSegment(name: string): boolean {
    if (!this.segmentCache[name]) return false;

    delete this.segmentCache[name];

    return true;
  }

  isInSegment(name: string): boolean {
    return this.segmentCache[name] === true;
  }


  protected setChangeNumber(changeNumber?: number) {
    this.cn = changeNumber;
  }

  getChangeNumber() {
    return this.cn || -1;
  }

  protected getSegments() {
    return Object.keys(this.segmentCache);
  }

  getKeysCount() {
    return 1;
  }

}
