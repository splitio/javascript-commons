import { isFiniteNumber, toNumber, isNaNNumber } from '../../utils/lang';
import KeyBuilder from '../KeyBuilder';
import { ICustomStorageWrapper, ISplitsCacheAsync } from '../types';
import { ILogger } from '../../logger/types';
import { usesSegments } from '../AbstractSplitsCacheSync';
import { ISplit } from '../../dtos/types';
import { LOG_PREFIX } from './constants';
import { SplitError } from '../../utils/lang/errors';

/**
 * ISplitsCacheAsync implementation for pluggable storages.
 */
export class SplitsCachePluggable implements ISplitsCacheAsync {

  private readonly log: ILogger;
  private readonly keys: KeyBuilder;
  private readonly wrapper: ICustomStorageWrapper;

  /**
   * Create a SplitsCache that uses a custom storage wrapper.
   * @param log  Logger instance.
   * @param keys  Key builder.
   * @param wrapper  Adapted wrapper storage.
   */
  constructor(log: ILogger, keys: KeyBuilder, wrapper: ICustomStorageWrapper) {
    this.log = log;
    this.keys = keys;
    this.wrapper = wrapper;
  }

  private _decrementCounts(split: ISplit) {
    const promises = [];
    if (split.trafficTypeName) {
      const ttKey = this.keys.buildTrafficTypeKey(split.trafficTypeName);
      promises.push(this.wrapper.decr(ttKey));
    }

    if (usesSegments(split)) {
      const segmentsCountKey = this.keys.buildSplitsWithSegmentCountKey();
      promises.push(this.wrapper.decr(segmentsCountKey));
    }

    return Promise.all(promises);
  }

  private _incrementCounts(split: ISplit) {
    const promises = [];
    if (split.trafficTypeName) {
      const ttKey = this.keys.buildTrafficTypeKey(split.trafficTypeName);
      promises.push(this.wrapper.incr(ttKey));
    }

    if (usesSegments(split)) {
      const segmentsCountKey = this.keys.buildSplitsWithSegmentCountKey();
      promises.push(this.wrapper.incr(segmentsCountKey));
    }

    return Promise.all(promises);
  }

  /**
   * Add a given split.
   * The returned promise is resolved when the operation success
   * or rejected with an SplitError if it fails (e.g., wrapper operation fails)
   */
  addSplit(name: string, split: string): Promise<boolean> {
    const splitKey = this.keys.buildSplitKey(name);
    return this.wrapper.get(splitKey).then(splitFromStorage => {

      // handling parsing error as SplitErrors
      let parsedPreviousSplit, parsedSplit;
      try {
        parsedPreviousSplit = splitFromStorage ? JSON.parse(splitFromStorage) : undefined;
        parsedSplit = JSON.parse(split);
      } catch (e) {
        throw new SplitError('Error parsing split definition: ' + e);
      }

      return Promise.all<boolean[], boolean, boolean[]>([
        // If it's an update, we decrement the traffic type and segment count of the existing split,
        parsedPreviousSplit && this._decrementCounts(parsedPreviousSplit),
        this.wrapper.set(splitKey, split),
        this._incrementCounts(parsedSplit)
      ]);
    }).then(() => true);
  }

  /**
   * Add a list of splits.
   * The returned promise is resolved when the operation success
   * or rejected with an SplitError if it fails (e.g., wrapper operation fails)
   */
  addSplits(entries: [string, string][]): Promise<boolean[]> {
    return Promise.all(entries.map(keyValuePair => this.addSplit(keyValuePair[0], keyValuePair[1])));
  }

  /**
   * Remove a given split.
   * The returned promise is resolved when the operation success, with a boolean indicating if the split existed or not.
   * or rejected with an SplitError if it fails (e.g., wrapper operation fails).
   */
  removeSplit(name: string): Promise<boolean> {
    return this.getSplit(name).then((split) => {
      if (split) {
        const parsedSplit = JSON.parse(split);
        this._decrementCounts(parsedSplit);
      }
      return this.wrapper.del(this.keys.buildSplitKey(name));
    });
  }

  /**
   * Remove a list of splits.
   * The returned promise is resolved when the operation success, with a boolean array indicating if the splits existed or not.
   * or rejected with an SplitError if it fails (e.g., wrapper operation fails).
   */
  removeSplits(names: string[]): Promise<boolean[]> {
    return Promise.all(names.map(name => this.removeSplit(name)));
  }

  /**
   * Get split.
   * The returned promise is resolved with the split definition or null if it's not defined,
   * or rejected with an SplitError if wrapper operation fails.
   */
  getSplit(name: string): Promise<string | null> {
    return this.wrapper.get(this.keys.buildSplitKey(name));
  }

  /**
   * Get list of splits.
   * The returned promise is resolved with a map of split names to their split definition or null if it's not defined,
   * or rejected with an SplitError if wrapper operation fails.
   */
  getSplits(names: string[]): Promise<Record<string, string | null>> {
    const keys = names.map(name => this.keys.buildSplitKey(name));

    return this.wrapper.getMany(keys).then(splitDefinitions => {
      const splits: Record<string, string | null> = {};
      names.forEach((name, idx) => {
        splits[name] = splitDefinitions[idx];
      });
      return Promise.resolve(splits);
    });
  }

  /**
   * Get list of all split definitions.
   * The returned promise is resolved with the list of split definitions,
   * or rejected with an SplitError if wrapper operation fails.
   */
  getAll(): Promise<string[]> {
    return this.wrapper.getKeysByPrefix(this.keys.buildSplitKeyPrefix()).then(
      (listOfKeys) => Promise.all(listOfKeys.map(this.wrapper.get) as Promise<string>[])
    );
  }

  /**
   * Get list of split names.
   * The returned promise is resolved with the list of split names,
   * or rejected with an SplitError if wrapper operation fails.
   */
  getSplitNames(): Promise<string[]> {
    return this.wrapper.getKeysByPrefix(this.keys.buildSplitKeyPrefix()).then(
      (listOfKeys) => listOfKeys.map(this.keys.extractKey)
    );
  }

  /**
   * Check traffic type existence.
   * The returned promise is resolved with a boolean indicating whether the TT exist or not.
   * In case of wrapper operation failures, the promise resolves with a true value, assuming that the TT might exist.
   * It will never be rejected.
   */
  trafficTypeExists(trafficType: string): Promise<boolean> {
    // If there is a number there should be > 0, otherwise the TT is considered as not existent.
    return this.wrapper.get(this.keys.buildTrafficTypeKey(trafficType))
      .then((ttCount: string | null | number) => {
        if (ttCount === null) return false; // if entry doesn't exist, means that TT doesn't exist

        ttCount = parseInt(ttCount as string, 10);
        if (!isFiniteNumber(ttCount) || ttCount < 0) {
          this.log.info(LOG_PREFIX + `Could not validate traffic type existence of ${trafficType} due to data corruption of some sorts.`);
          return false;
        }

        return ttCount > 0;
      }).catch(e => {
        this.log.error(LOG_PREFIX + `Could not validate traffic type existence of ${trafficType} due to an error: ${e}.`);
        // If there is an error, bypass the validation so the event can get tracked.
        return true;
      });
  }

  /**
   * Set till number.
   * The returned promise is resolved when the operation success,
   * or rejected with an SplitError if it fails (e.g., wrapper operation fails).
   */
  setChangeNumber(changeNumber: number): Promise<boolean> {
    return this.wrapper.set(this.keys.buildSplitsTillKey(), changeNumber + '');
  }

  /**
   * Get till number or -1 if it's not defined.
   * The returned promise is resolved with the changeNumber or -1 if it doesn't exist or a wrapper operation fails.
   * The promise will never be rejected.
   */
  getChangeNumber(): Promise<number> {
    return this.wrapper.get(this.keys.buildSplitsTillKey()).then((value) => {
      const i = parseInt(value as string, 10);

      return isNaNNumber(i) ? -1 : i;
    }).catch((e) => {
      this.log.error(LOG_PREFIX + 'Could not retrieve changeNumber from storage. Error: ' + e);
      return -1;
    });
  }

  // @TODO revisit segment-related methods ('usesSegments', 'getRegisteredSegments', 'registerSegments')
  usesSegments(): Promise<boolean> {
    return this.wrapper.get(this.keys.buildSplitsWithSegmentCountKey())
      .then(storedCount => {
        const splitsWithSegmentsCount = storedCount ? toNumber(storedCount) : 0;
        if (isFiniteNumber(splitsWithSegmentsCount)) {
          return splitsWithSegmentsCount > 0;
        } else {
          return true; // If stored valus is invalid, assume we need them.
        }
      }).catch(() => true); // If wrapper operation fails, assume we need them.
  }

  // @TODO implement for DataLoader/Producer mode
  clear(): Promise<boolean> {
    return Promise.resolve(true);
  }

  /**
   * Check if the splits information is already stored in cache.
   * Noop, just keeping the interface. This is used by client-side implementations only.
   */
  checkCache(): Promise<boolean> {
    return Promise.resolve(true);
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
