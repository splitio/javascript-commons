import { ISplit } from '../../dtos/types';
import { AbstractSplitsCacheSync, usesSegments } from '../AbstractSplitsCacheSync';
import { isFiniteNumber } from '../../utils/lang';

/**
 * Default ISplitsCacheSync implementation that stores split definitions in memory.
 * Supported by all JS runtimes.
 */
export class SplitsCacheInMemory extends AbstractSplitsCacheSync {

  private splitsCache: Record<string, string> = {};
  private ttCache: Record<string, number> = {};
  private changeNumber: number = -1;
  private splitsWithSegmentsCount: number = 0;

  clear() {
    this.splitsCache = {};
    this.ttCache = {};
    this.changeNumber = -1;
    this.splitsWithSegmentsCount = 0;
  }

  addSplit(name: string, split: string): boolean {
    const splitFromMemory = this.getSplit(name);
    if (splitFromMemory) { // We had this Split already
      const previousSplit: ISplit = JSON.parse(splitFromMemory);

      if (previousSplit.trafficTypeName) {
        const previousTtName = previousSplit.trafficTypeName;
        this.ttCache[previousTtName]--;
        if (!this.ttCache[previousTtName]) delete this.ttCache[previousTtName];
      }

      if (usesSegments(previousSplit)) { // Substract from segments count for the previous version of this Split.
        this.splitsWithSegmentsCount--;
      }
    }

    const parsedSplit: ISplit = JSON.parse(split);

    if (parsedSplit) {
      // Store the Split.
      this.splitsCache[name] = split;
      // Update TT cache
      const ttName = parsedSplit.trafficTypeName;
      if (ttName) { // safeguard
        if (!this.ttCache[ttName]) this.ttCache[ttName] = 0;
        this.ttCache[ttName]++;
      }

      // Add to segments count for the new version of the Split
      if (usesSegments(parsedSplit)) this.splitsWithSegmentsCount++;

      return true;
    } else {
      return false;
    }
  }

  removeSplit(name: string): boolean {
    const split = this.getSplit(name);
    if (split) {
      // Delete the Split
      delete this.splitsCache[name];

      const parsedSplit: ISplit = JSON.parse(split);
      const ttName = parsedSplit.trafficTypeName;

      if (ttName) { // safeguard
        this.ttCache[ttName]--; // Update tt cache
        if (!this.ttCache[ttName]) delete this.ttCache[ttName];
      }

      // Update the segments count.
      if (usesSegments(parsedSplit)) this.splitsWithSegmentsCount--;

      return true;
    } else {
      return false;
    }
  }

  getSplit(name: string): string | null {
    return this.splitsCache[name] || null;
  }

  setChangeNumber(changeNumber: number): boolean {
    this.changeNumber = changeNumber;
    return true;
  }

  getChangeNumber(): number {
    return this.changeNumber;
  }

  getSplitNames(): string[] {
    return Object.keys(this.splitsCache);
  }

  trafficTypeExists(trafficType: string): boolean {
    return isFiniteNumber(this.ttCache[trafficType]) && this.ttCache[trafficType] > 0;
  }

  usesSegments(): boolean {
    return this.getChangeNumber() === -1 || this.splitsWithSegmentsCount > 0;
  }

}
