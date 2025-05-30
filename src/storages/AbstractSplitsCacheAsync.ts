import { ISplitsCacheAsync } from './types';
import { ISplit } from '../dtos/types';
import { objectAssign } from '../utils/lang/objectAssign';

/**
 * This class provides a skeletal implementation of the ISplitsCacheAsync interface
 * to minimize the effort required to implement this interface.
 */
export abstract class AbstractSplitsCacheAsync implements ISplitsCacheAsync {

  protected abstract addSplit(split: ISplit): Promise<boolean>
  protected abstract removeSplit(name: string): Promise<boolean>
  protected abstract setChangeNumber(changeNumber: number): Promise<boolean | void>

  update(toAdd: ISplit[], toRemove: ISplit[], changeNumber: number): Promise<boolean> {
    return Promise.all([
      this.setChangeNumber(changeNumber),
      Promise.all(toAdd.map(addedFF => this.addSplit(addedFF))),
      Promise.all(toRemove.map(removedFF => this.removeSplit(removedFF.name)))
    ]).then(([, added, removed]) => {
      return added.some(result => result) || removed.some(result => result);
    });
  }

  abstract getSplit(name: string): Promise<ISplit | null>
  abstract getSplits(names: string[]): Promise<Record<string, ISplit | null>>
  abstract getChangeNumber(): Promise<number>
  abstract getAll(): Promise<ISplit[]>
  abstract getSplitNames(): Promise<string[]>
  abstract getNamesByFlagSets(flagSets: string[]): Promise<Set<string>[]>
  abstract trafficTypeExists(trafficType: string): Promise<boolean>
  abstract clear(): Promise<boolean | void>

  // @TODO revisit segment-related methods ('usesSegments')
  // noop, just keeping the interface. This is used by standalone client-side API only, and so only implemented by InMemory and InLocalStorage.
  usesSegments(): Promise<boolean> {
    return Promise.resolve(true);
  }

  /**
   * Kill `name` split and set `defaultTreatment` and `changeNumber`.
   * Used for SPLIT_KILL push notifications.
   *
   * @returns a promise that is resolved once the split kill operation is performed. The fulfillment value is a boolean: `true` if the operation successed updating the split or `false` if no split is updated,
   * for instance, if the `changeNumber` is old, or if the split is not found (e.g., `/splitchanges` hasn't been fetched yet), or if the storage fails to apply the update.
   * The promise will never be rejected.
   */
  killLocally(name: string, defaultTreatment: string, changeNumber: number): Promise<boolean> {
    return this.getSplit(name).then(split => {

      if (split && (!split.changeNumber || split.changeNumber < changeNumber)) {
        const newSplit = objectAssign({}, split);
        newSplit.killed = true;
        newSplit.defaultTreatment = defaultTreatment;
        newSplit.changeNumber = changeNumber;

        return this.addSplit(newSplit);
      }
      return false;
    }).catch(() => false);
  }

}
