import { ISplitsCacheSync } from './types';
import { ISplit } from '../dtos/types';
import { objectAssign } from '../utils/lang/objectAssign';
import { IN_SEGMENT, IN_LARGE_SEGMENT } from '../utils/constants';

/**
 * This class provides a skeletal implementation of the ISplitsCacheSync interface
 * to minimize the effort required to implement this interface.
 */
export abstract class AbstractSplitsCacheSync implements ISplitsCacheSync {

  abstract addSplit(name: string, split: ISplit): boolean

  addSplits(entries: [string, ISplit][]): boolean[] {
    return entries.map(keyValuePair => this.addSplit(keyValuePair[0], keyValuePair[1]));
  }

  abstract removeSplit(name: string): boolean

  removeSplits(names: string[]): boolean[] {
    return names.map(name => this.removeSplit(name));
  }

  abstract getSplit(name: string): ISplit | null

  getSplits(names: string[]): Record<string, ISplit | null> {
    const splits: Record<string, ISplit | null> = {};
    names.forEach(name => {
      splits[name] = this.getSplit(name);
    });
    return splits;
  }

  abstract setChangeNumber(changeNumber: number): boolean | void

  abstract getChangeNumber(): number

  getAll(): ISplit[] {
    return this.getSplitNames().map(key => this.getSplit(key) as ISplit);
  }

  abstract getSplitNames(): string[]

  abstract trafficTypeExists(trafficType: string): boolean

  abstract usesSegments(): boolean

  abstract clear(): void

  /**
   * Check if the splits information is already stored in cache. This data can be preloaded.
   * It is used as condition to emit SDK_SPLITS_CACHE_LOADED, and then SDK_READY_FROM_CACHE.
   */
  checkCache(): boolean {
    return false;
  }

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

      return this.addSplit(name, newSplit);
    }
    return false;
  }

  abstract getNamesByFlagSets(flagSets: string[]): Set<string>[]

}

/**
 * Given a parsed split, it returns a boolean flagging if its conditions use segments matchers (rules & whitelists).
 * This util is intended to simplify the implementation of `splitsCache::usesSegments` method
 */
export function usesSegments(split: ISplit) {
  const conditions = split.conditions || [];
  for (let i = 0; i < conditions.length; i++) {
    const matchers = conditions[i].matcherGroup.matchers;

    for (let j = 0; j < matchers.length; j++) {
      const matcher = matchers[j].matcherType;
      if (matcher === IN_SEGMENT || matcher === IN_LARGE_SEGMENT) return true;
    }
  }

  return false;
}
