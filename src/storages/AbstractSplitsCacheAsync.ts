import { ISplitsCacheAsync } from './types';
import { ISplit } from '../dtos/types';

/**
 * This class provides a skeletal implementation of the ISplitsCacheAsync interface
 * to minimize the effort required to implement this interface.
 */
export abstract class AbstractSplitsCacheAsync implements ISplitsCacheAsync {

  abstract addSplit(name: string, split: string): Promise<boolean>
  abstract addSplits(entries: [string, string][]): Promise<boolean[] | void>
  abstract removeSplits(names: string[]): Promise<boolean[] | void>
  abstract getSplit(name: string): Promise<string | null>
  abstract getSplits(names: string[]): Promise<Record<string, string | null>>
  abstract setChangeNumber(changeNumber: number): Promise<boolean | void>
  abstract getChangeNumber(): Promise<number>
  abstract getAll(): Promise<string[]>
  abstract getSplitNames(): Promise<string[]>
  abstract trafficTypeExists(trafficType: string): Promise<boolean>
  abstract clear(): Promise<boolean | void>

  // @TODO revisit segment-related methods ('usesSegments', 'getRegisteredSegments', 'registerSegments')
  // noop, just keeping the interface. This is used by standalone client-side API only, and so only implemented by InMemory and InLocalStorage.
  usesSegments(): Promise<boolean> {
    return Promise.resolve(true);
  }

  /**
   * Check if the splits information is already stored in cache.
   * Noop, just keeping the interface. This is used by client-side implementations only.
   */
  checkCache(): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Kill `name` split and set `defaultTreatment` and `changeNumber`.
   * Used for SPLIT_KILL push notifications.
   *
   * @param {string} name
   * @param {string} defaultTreatment
   * @param {number} changeNumber
   * @returns {Promise} a promise that is resolved once the split kill operation is performed. The fulfillment value is a boolean: `true` if the kill success updating the split or `false` if no split is updated,
   * for instance, if the `changeNumber` is old, or if the split is not found (e.g., `/splitchanges` hasn't been fetched yet), or if the storage fails to apply the update.
   * The promise will never be rejected.
   */
  killLocally(name: string, defaultTreatment: string, changeNumber: number): Promise<boolean> {
    return this.getSplit(name).then(split => {

      if (split) {
        const parsedSplit: ISplit = JSON.parse(split);
        if (!parsedSplit.changeNumber || parsedSplit.changeNumber < changeNumber) {
          parsedSplit.killed = true;
          parsedSplit.defaultTreatment = defaultTreatment;
          parsedSplit.changeNumber = changeNumber;
          const newSplit = JSON.stringify(parsedSplit);

          return this.addSplit(name, newSplit);
        }
      }
      return false;
    }).catch(() => false);
  }

}
