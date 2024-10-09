import { ISplit, ISplitFiltersValidation } from '../../dtos/types';
import { AbstractSplitsCacheSync, usesSegments } from '../AbstractSplitsCacheSync';
import { isFiniteNumber } from '../../utils/lang';

/**
 * Default ISplitsCacheSync implementation that stores split definitions in memory.
 * Supported by all JS runtimes.
 */
export class SplitsCacheInMemory extends AbstractSplitsCacheSync {

  private flagSetsFilter: string[];
  private splitsCache: Record<string, ISplit> = {};
  private ttCache: Record<string, number> = {};
  private changeNumber: number = -1;
  private segmentsCount: number = 0;
  private flagSetsCache: Record<string, Set<string>> = {};

  constructor(splitFiltersValidation?: ISplitFiltersValidation) {
    super();
    this.flagSetsFilter = splitFiltersValidation ? splitFiltersValidation.groupedFilters.bySet : [];
  }

  clear() {
    this.splitsCache = {};
    this.ttCache = {};
    this.changeNumber = -1;
    this.segmentsCount = 0;
  }

  addSplit(name: string, split: ISplit): boolean {
    const previousSplit = this.getSplit(name);
    if (previousSplit) { // We had this Split already

      const previousTtName = previousSplit.trafficTypeName;
      this.ttCache[previousTtName]--;
      if (!this.ttCache[previousTtName]) delete this.ttCache[previousTtName];

      this.removeFromFlagSets(previousSplit.name, previousSplit.sets);

      // Subtract from segments count for the previous version of this Split
      if (usesSegments(previousSplit)) this.segmentsCount--;
    }

    if (split) {
      // Store the Split.
      this.splitsCache[name] = split;
      // Update TT cache
      const ttName = split.trafficTypeName;
      this.ttCache[ttName] = (this.ttCache[ttName] || 0) + 1;
      this.addToFlagSets(split);

      // Add to segments count for the new version of the Split
      if (usesSegments(split)) this.segmentsCount++;

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
      this.removeFromFlagSets(split.name, split.sets);

      // Update the segments count.
      if (usesSegments(split)) this.segmentsCount--;

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
    return this.getChangeNumber() === -1 || this.segmentsCount > 0;
  }

  getNamesByFlagSets(flagSets: string[]): Set<string>[] {
    return flagSets.map(flagSet => this.flagSetsCache[flagSet] || new Set());
  }

  private addToFlagSets(featureFlag: ISplit) {
    if (!featureFlag.sets) return;
    featureFlag.sets.forEach(featureFlagSet => {

      if (this.flagSetsFilter.length > 0 && !this.flagSetsFilter.some(filterFlagSet => filterFlagSet === featureFlagSet)) return;

      if (!this.flagSetsCache[featureFlagSet]) this.flagSetsCache[featureFlagSet] = new Set([]);

      this.flagSetsCache[featureFlagSet].add(featureFlag.name);
    });
  }

  private removeFromFlagSets(featureFlagName: string, flagSets: string[] | undefined) {
    if (!flagSets) return;
    flagSets.forEach(flagSet => {
      this.removeNames(flagSet, featureFlagName);
    });
  }

  private removeNames(flagSetName: string, featureFlagName: string) {
    if (!this.flagSetsCache[flagSetName]) return;
    this.flagSetsCache[flagSetName].delete(featureFlagName);
    if (this.flagSetsCache[flagSetName].size === 0) delete this.flagSetsCache[flagSetName];
  }

}
