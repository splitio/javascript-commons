import { ISplit, ISplitFiltersValidation } from '../../dtos/types';
import { AbstractSplitsCacheSync, usesSegments } from '../AbstractSplitsCacheSync';
import { isFiniteNumber } from '../../utils/lang';
import { ISet, _Set, returnSetsUnion } from '../../utils/lang/sets';

/**
 * Default ISplitsCacheSync implementation that stores split definitions in memory.
 * Supported by all JS runtimes.
 */
export class SplitsCacheInMemory extends AbstractSplitsCacheSync {

  private flagsetsFilter: string[];
  private splitsCache: Record<string, ISplit> = {};
  private ttCache: Record<string, number> = {};
  private changeNumber: number = -1;
  private splitsWithSegmentsCount: number = 0;
  private flagsetsCache: Record<string, ISet<string>> = {};

  constructor(splitFiltersValidation: ISplitFiltersValidation = { queryString: null, groupedFilters: { bySet: [], byName: [], byPrefix: [] }, validFilters: [] }) {
    super();
    this.flagsetsFilter = splitFiltersValidation.groupedFilters.bySet;
  }

  clear() {
    this.splitsCache = {};
    this.ttCache = {};
    this.changeNumber = -1;
    this.splitsWithSegmentsCount = 0;
  }

  addSplit(name: string, split: ISplit): boolean {
    const previousSplit = this.getSplit(name);
    if (previousSplit) { // We had this Split already

      const previousTtName = previousSplit.trafficTypeName;
      this.ttCache[previousTtName]--;
      if (!this.ttCache[previousTtName]) delete this.ttCache[previousTtName];

      this.removeFromFlagsets(previousSplit.name, previousSplit.sets);

      if (usesSegments(previousSplit)) { // Substract from segments count for the previous version of this Split.
        this.splitsWithSegmentsCount--;
      }
    }

    if (split) {
      // Store the Split.
      this.splitsCache[name] = split;
      // Update TT cache
      const ttName = split.trafficTypeName;
      this.ttCache[ttName] = (this.ttCache[ttName] || 0) + 1;
      this.addToFlagsets(split);

      // Add to segments count for the new version of the Split
      if (usesSegments(split)) this.splitsWithSegmentsCount++;

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

      const ttName = split.trafficTypeName;
      this.ttCache[ttName]--; // Update tt cache
      if (!this.ttCache[ttName]) delete this.ttCache[ttName];
      this.removeFromFlagsets(split.name, split.sets);

      // Update the segments count.
      if (usesSegments(split)) this.splitsWithSegmentsCount--;

      return true;
    } else {
      return false;
    }
  }

  getSplit(name: string): ISplit | null {
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

  getNamesByFlagsets(flagsets: string[]): ISet<string>{
    let toReturn: ISet<string> = new _Set([]);
    flagsets.forEach(flagset => {
      const featureFlagNames = this.flagsetsCache[flagset];
      if (featureFlagNames) {
        toReturn = returnSetsUnion(toReturn, featureFlagNames);
      }
    });
    return toReturn;

  }

  private addToFlagsets(featureFlag: ISplit) {
    if (!featureFlag.sets) return;
    featureFlag.sets.forEach(featureFlagset => {

      if (this.flagsetsFilter.length > 0 && !this.flagsetsFilter.some(filterFlagset => filterFlagset === featureFlagset)) return;

      if (!this.flagsetsCache[featureFlagset]) this.flagsetsCache[featureFlagset] = new _Set([]);

      this.flagsetsCache[featureFlagset].add(featureFlag.name);
    });
  }

  private removeFromFlagsets(featureFlagName :string, flagsets: string[] | undefined) {
    if (!flagsets) return;
    flagsets.forEach(flagset => {
      this.removeNames(flagset, featureFlagName);
    });
  }

  private removeNames(flagsetName: string, featureFlagName: string) {
    if (!this.flagsetsCache[flagsetName]) return;
    this.flagsetsCache[flagsetName].delete(featureFlagName);
    if (this.flagsetsCache[flagsetName].size === 0) delete this.flagsetsCache[flagsetName];
  }

}
