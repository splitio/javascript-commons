import { IPluggableStorageWrapper, IEventsCacheAsync } from '../types';
import { IMetadata } from '../../dtos/types';
import { SplitIO } from '../../types';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';
import { StoredEventWithMetadata } from '../../sync/submitters/types';

export class EventsCachePluggable implements IEventsCacheAsync {

  private readonly log: ILogger;
  private readonly wrapper: IPluggableStorageWrapper;
  private readonly key: string;
  private readonly metadata: IMetadata;

  constructor(log: ILogger, key: string, wrapper: IPluggableStorageWrapper, metadata: IMetadata) {
    this.log = log;
    this.key = key;
    this.wrapper = wrapper;
    this.metadata = metadata;
  }

  /**
   * Push given event to the storage.
   * @param eventData  Event item to push.
   * @returns  A promise that is resolved with a boolean value indicating if the push operation succeeded or failed.
   * Unlike `impressions::track`, The promise will never be rejected.
   */
  track(eventData: SplitIO.EventData): Promise<boolean> {
    return this.wrapper.pushItems(
      this.key,
      [this._toJSON(eventData)]
    )
      // We use boolean values to signal successful queueing
      .then(() => true)
      .catch(e => {
        this.log.error(`${LOG_PREFIX}Error adding event to queue: ${e}.`);
        return false;
      });
  }

  private _toJSON(eventData: SplitIO.EventData): string {
    return JSON.stringify({
      m: this.metadata,
      e: eventData
    } as StoredEventWithMetadata);
  }

  /**
   * Returns a promise that resolves with the count of stored events, or 0 if there was some error.
   * The promise will never be rejected.
   */
  count(): Promise<number> {
    return this.wrapper.getItemsCount(this.key).catch(() => 0);
  }

  /**
   * Removes the given number of events from the store. If a number is not provided, it deletes all items.
   * The returned promise rejects if the wrapper operation fails.
   */
  drop(count?: number): Promise<any> {
    if (!count) return this.wrapper.del(this.key);

    return this.wrapper.popItems(this.key, count).then(() => { });
  }

  /**
   * Pop the given number of events from the storage.
   * The returned promise rejects if the wrapper operation fails.
   *
   * NOTE: this method doesn't take into account MAX_EVENT_SIZE or MAX_QUEUE_BYTE_SIZE limits.
   * It is the submitter responsability to handle that.
   */
  popNWithMetadata(count: number): Promise<StoredEventWithMetadata[]> {
    return this.wrapper.popItems(this.key, count).then((items) => {
      return items.map(item => JSON.parse(item) as StoredEventWithMetadata);
    });
  }

}
