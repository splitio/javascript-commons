import { IPluggableStorageWrapper, IImpressionsCacheAsync } from '../types';
import { IMetadata } from '../../dtos/types';
import { ImpressionDTO } from '../../types';
import { StoredImpressionWithMetadata } from '../../sync/submitters/types';
import { ILogger } from '../../logger/types';
import { impressionsToJSON } from '../utils';

export class ImpressionsCachePluggable implements IImpressionsCacheAsync {

  private readonly log: ILogger;
  private readonly key: string;
  private readonly wrapper: IPluggableStorageWrapper;
  private readonly metadata: IMetadata;

  constructor(log: ILogger, key: string, wrapper: IPluggableStorageWrapper, metadata: IMetadata) {
    this.log = log;
    this.key = key;
    this.wrapper = wrapper;
    this.metadata = metadata;
  }

  /**
   * Push given impressions to the storage.
   * @param impressions  List of impresions to push.
   * @returns  A promise that is resolved if the push operation succeeded
   * or rejected if the wrapper operation fails.
   */
  track(impressions: ImpressionDTO[]): Promise<void> {
    return this.wrapper.pushItems(
      this.key,
      impressionsToJSON(impressions, this.metadata)
    );
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
  drop(count?: number): Promise<void> { // @ts-ignore
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
