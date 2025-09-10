import { ISplitsCacheSync, IStorageSync } from './types';
import { IRBSegment, ISplit } from '../dtos/types';
import { objectAssign } from '../utils/lang/objectAssign';
import { IN_SEGMENT, IN_LARGE_SEGMENT } from '../utils/constants';

/**
 * This class provides a skeletal implementation of the ISplitsCacheSync interface
 * to minimize the effort required to implement this interface.
 */
export abstract class AbstractSplitsCacheSync implements ISplitsCacheSync {

  protected abstract addSplit(split: ISplit): boolean
  protected abstract removeSplit(name: string): boolean
  protected abstract setChangeNumber(changeNumber: number): boolean | void

  update(toAdd: ISplit[], toRemove: ISplit[], changeNumber: number): boolean {
    this.setChangeNumber(changeNumber);
    const updated = toAdd.map(addedFF => this.addSplit(addedFF)).some(result => result);
    return toRemove.map(removedFF => this.removeSplit(removedFF.name)).some(result => result) || updated;
  }

  abstract getSplit(name: string): ISplit | null

  getSplits(names: string[]): Record<string, ISplit | null> {
    const splits: Record<string, ISplit | null> = {};
    names.forEach(name => {
      splits[name] = this.getSplit(name);
    });
    return splits;
  }

  abstract getChangeNumber(): number

  getAll(): ISplit[] {
    return this.getSplitNames().map(key => this.getSplit(key) as ISplit);
  }

  abstract getSplitNames(): string[]

  abstract trafficTypeExists(trafficType: string): boolean

  abstract usesSegments(): boolean

  abstract clear(): void

  /**
   * Kill `name` split and set `defaultTreatment` and `changeNumber`.
   * Used for SPLIT_KILL push notifications.
   *
   * @returns `true` if the operation successed updating the split, or `false` if no split is updated,
   * for instance, if the `changeNumber` is old, or if the split is not found (e.g., `/splitchanges` hasn't been fetched yet), or if the storage fails to apply the update.
   */
  killLocally(name: string, defaultTreatment: string, changeNumber: number): boolean {
    const split = this.getSplit(name);

    if (split && (!split.changeNumber || split.changeNumber < changeNumber)) {
      const newSplit = objectAssign({}, split);
      newSplit.killed = true;
      newSplit.defaultTreatment = defaultTreatment;
      newSplit.changeNumber = changeNumber;

      return this.addSplit(newSplit);
    }
    return false;
  }

  abstract getNamesByFlagSets(flagSets: string[]): Set<string>[]

}

/**
 * Given a parsed split, it returns a boolean flagging if its conditions use segments matchers (rules & whitelists).
 * This util is intended to simplify the implementation of `splitsCache::usesSegments` method
 */
export function usesSegments(ruleEntity: ISplit | IRBSegment) {
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

export function usesSegmentsSync(storage: Pick<IStorageSync, 'splits' | 'rbSegments'>) {
  return storage.splits.usesSegments() || storage.rbSegments.usesSegments();
}
