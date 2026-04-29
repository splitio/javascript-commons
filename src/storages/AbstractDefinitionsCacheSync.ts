import { IDefinitionsCacheSync, IStorageSync } from './types';
import { IRBSegment, IDefinition } from '../dtos/types';
import { objectAssign } from '../utils/lang/objectAssign';
import { IN_SEGMENT, IN_LARGE_SEGMENT } from '../utils/constants';

/**
 * This class provides a skeletal implementation of the IDefinitionsCacheSync interface
 * to minimize the effort required to implement this interface.
 */
export abstract class AbstractDefinitionsCacheSync implements IDefinitionsCacheSync {

  protected abstract add(definition: IDefinition): boolean
  protected abstract remove(name: string): boolean
  protected abstract setChangeNumber(changeNumber: number): boolean | void

  update(toAdd: IDefinition[], toRemove: string[], changeNumber: number): boolean {
    let updated = toAdd.map(addedFF => this.add(addedFF)).some(result => result);
    updated = toRemove.map(removedFF => this.remove(removedFF)).some(result => result) || updated;
    this.setChangeNumber(changeNumber);
    return updated;
  }

  abstract get(name: string): IDefinition | null

  getMany(names: string[]): Record<string, IDefinition | null> {
    const definitions: Record<string, IDefinition | null> = {};
    names.forEach(name => {
      definitions[name] = this.get(name);
    });
    return definitions;
  }

  abstract getChangeNumber(): number

  getAll(): IDefinition[] {
    return this.getNames().map(key => this.get(key) as IDefinition);
  }

  abstract getNames(): string[]

  abstract trafficTypeExists(trafficType: string): boolean

  abstract usesSegments(): boolean

  abstract clear(): void

  /**
   * Kill `name` definition and set `defaultTreatment` and `changeNumber`.
   * Used for SPLIT_KILL push notifications.
   *
   * @returns `true` if the operation successed updating the definition, or `false` if no definition is updated,
   * for instance, if the `changeNumber` is old, or if the definition is not found (e.g., `/splitchanges` hasn't been fetched yet), or if the storage fails to apply the update.
   */
  killLocally(name: string, defaultTreatment: string, changeNumber: number): boolean {
    const definition = this.get(name);

    if (definition && (!definition.changeNumber || definition.changeNumber < changeNumber)) {
      const newDefinition = objectAssign({}, definition);
      newDefinition.killed = true;
      newDefinition.defaultTreatment = defaultTreatment;
      newDefinition.changeNumber = changeNumber;

      return this.add(newDefinition);
    }
    return false;
  }

  abstract getNamesBySets(sets: string[]): Set<string>[]

}

/**
 * Given a parsed definition, it returns a boolean flagging if its conditions use segments matchers (rules & whitelists).
 * This util is intended to simplify the implementation of `definitionsCache::usesSegments` method
 */
export function usesSegments(ruleEntity: IDefinition | IRBSegment) {
  const conditions = ruleEntity.conditions || [];
  for (let i = 0; i < conditions.length; i++) {
    const matchers = conditions[i].matcherGroup.matchers;

    for (let j = 0; j < matchers.length; j++) {
      const matcher = matchers[j].matcherType;
      if (matcher === IN_SEGMENT || matcher === IN_LARGE_SEGMENT) return true;
    }
  }

  const excluded = (ruleEntity as IRBSegment).excluded;
  if (excluded && excluded.segments && excluded.segments.length > 0) return true;

  return false;
}

export function usesSegmentsSync(storage: Pick<IStorageSync, 'definitions' | 'rbSegments'>) {
  return storage.definitions.usesSegments() || storage.rbSegments.usesSegments();
}
