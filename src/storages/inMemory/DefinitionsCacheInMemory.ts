import { IDefinition, ISplitFiltersValidation } from '../../dtos/types';
import { AbstractDefinitionsCacheSync, usesSegments } from '../AbstractDefinitionsCacheSync';
import { isFiniteNumber } from '../../utils/lang';

/**
 * Default IDefinitionsCacheSync implementation that stores split definitions in memory.
 */
export class DefinitionsCacheInMemory extends AbstractDefinitionsCacheSync {

  private setsFilter: string[];
  private definitionsCache: Record<string, IDefinition> = {};
  private ttCache: Record<string, number> = {};
  private changeNumber: number = -1;
  private segmentsCount: number = 0;
  private setsCache: Record<string, Set<string>> = {};

  constructor(splitFiltersValidation?: ISplitFiltersValidation) {
    super();
    this.setsFilter = splitFiltersValidation ? splitFiltersValidation.groupedFilters.bySet : [];
  }

  clear() {
    this.definitionsCache = {};
    this.ttCache = {};
    this.changeNumber = -1;
    this.segmentsCount = 0;
    this.setsCache = {};
  }

  add(definition: IDefinition): boolean {
    const name = definition.name;
    const previousDefinition = this.get(name);
    if (previousDefinition) { // We had this Split already

      const previousTtName = previousDefinition.trafficTypeName;
      this.ttCache[previousTtName]--;
      if (!this.ttCache[previousTtName]) delete this.ttCache[previousTtName];

      this.removeFromFlagSets(previousDefinition.name, previousDefinition.sets);

      // Subtract from segments count for the previous version of this Split
      if (usesSegments(previousDefinition)) this.segmentsCount--;
    }

    // Store the Split.
    this.definitionsCache[name] = definition;
    // Update TT cache
    const ttName = definition.trafficTypeName;
    this.ttCache[ttName] = (this.ttCache[ttName] || 0) + 1;
    this.addToFlagSets(definition);

    // Add to segments count for the new version of the Split
    if (usesSegments(definition)) this.segmentsCount++;

    return true;
  }

  remove(name: string): boolean {
    const definition = this.get(name);
    if (!definition) return false;

    // Delete the Split
    delete this.definitionsCache[name];

    const ttName = definition.trafficTypeName;
    this.ttCache[ttName]--; // Update tt cache
    if (!this.ttCache[ttName]) delete this.ttCache[ttName];
    this.removeFromFlagSets(definition.name, definition.sets);

    // Update the segments count.
    if (usesSegments(definition)) this.segmentsCount--;

    return true;
  }

  get(name: string): IDefinition | null {
    return this.definitionsCache[name] || null;
  }

  setChangeNumber(changeNumber: number): boolean {
    this.changeNumber = changeNumber;
    return true;
  }

  getChangeNumber(): number {
    return this.changeNumber;
  }

  getNames(): string[] {
    return Object.keys(this.definitionsCache);
  }

  trafficTypeExists(trafficType: string): boolean {
    return isFiniteNumber(this.ttCache[trafficType]) && this.ttCache[trafficType] > 0;
  }

  usesSegments(): boolean {
    return this.getChangeNumber() === -1 || this.segmentsCount > 0;
  }

  getNamesBySets(sets: string[]): Set<string>[] {
    return sets.map(set => this.setsCache[set] || new Set());
  }

  private addToFlagSets(featureFlag: IDefinition) {
    if (!featureFlag.sets) return;
    featureFlag.sets.forEach(featureFlagSet => {

      if (this.setsFilter.length > 0 && !this.setsFilter.some(filterFlagSet => filterFlagSet === featureFlagSet)) return;

      if (!this.setsCache[featureFlagSet]) this.setsCache[featureFlagSet] = new Set([]);

      this.setsCache[featureFlagSet].add(featureFlag.name);
    });
  }

  private removeFromFlagSets(featureFlagName: string, sets?: string[] | null) {
    if (!sets) return;
    sets.forEach(set => {
      this.removeNames(set, featureFlagName);
    });
  }

  private removeNames(setName: string, featureFlagName: string) {
    if (!this.setsCache[setName]) return;
    this.setsCache[setName].delete(featureFlagName);
    if (this.setsCache[setName].size === 0) delete this.setsCache[setName];
  }

}
