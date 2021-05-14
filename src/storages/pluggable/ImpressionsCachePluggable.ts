import { ICustomStorageWrapper, IImpressionsCacheAsync } from '../types';
import { IMetadata } from '../../dtos/types';
import { ImpressionDTO } from '../../types';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';
import { StoredImpressionWithMetadata } from '../../sync/submitters/types';

export class ImpressionsCachePluggable implements IImpressionsCacheAsync {

  private readonly log: ILogger;
  private readonly key: string;
  private readonly wrapper: ICustomStorageWrapper;
  private readonly metadata: IMetadata;

  constructor(log: ILogger, key: string, wrapper: ICustomStorageWrapper, metadata: IMetadata) {
    this.log = log;
    this.key = key;
    this.wrapper = wrapper;
    this.metadata = metadata;
  }

  /**
   * Push given impressions to the storage.
   * @param impressions  List of impresions to push.
   * @returns  A promise that is resolved with a boolean value indicating if the push operation succeeded or failed.
   * The promise will never be rejected.
   */
  track(impressions: ImpressionDTO[]): Promise<boolean> {
    return this.wrapper.pushItems(
      this.key,
      this._toJSON(impressions)
    )
      // We use boolean values to signal successful queueing
      .then(() => true)
      .catch((e) => {
        this.log.error(LOG_PREFIX + ` Error adding event to queue: ${e}.`);
        return false;
      });
  }

  private _toJSON(impressions: ImpressionDTO[]): string[] {
    return impressions.map(impression => {
      const {
        keyName, bucketingKey, feature, treatment, label, time, changeNumber
      } = impression;

      return JSON.stringify({
        m: this.metadata,
        i: {
          k: keyName,
          b: bucketingKey,
          f: feature,
          t: treatment,
          r: label,
          c: changeNumber,
          m: time
        }
      } as StoredImpressionWithMetadata);
    });
  }

  /**
   * Returns a promise that resolves with the count of stored impressions, or 0 if there was some error.
   * The promise will never be rejected.
   */
  count(): Promise<number> {
    return this.wrapper.getItemsCount(this.key).catch(() => 0);
  }

  /**
   * Removes the given number of impressions from the store. If a number is not provided, it deletes all items.
   * The returned promise rejects if the wrapper operation fails.
   */
  drop(count?: number): Promise<any> {
    if (!count) return this.wrapper.del(this.key);

    return this.wrapper.popItems(this.key, count).then(() => { });
  }

  /**
   * Pop the given number of impressions from the store.
   * The returned promise rejects if the wrapper operation fails.
   */
  popNWithMetadata(count: number): Promise<StoredImpressionWithMetadata[]> {
    return this.wrapper.popItems(this.key, count).then((items) => {
      return items.map(item => JSON.parse(item) as StoredImpressionWithMetadata);
    });
  }

}
