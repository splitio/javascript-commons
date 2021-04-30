import { ICustomStorageWrapper, IEventsCacheAsync } from '../types';
import { IRedisMetadata } from '../../dtos/types';
import KeyBuilderSS from '../KeyBuilderSS';
import { SplitIO } from '../../types';
import { ILogger } from '../../logger/types';
import { LOG_PREFIX } from './constants';

export class EventsCachePluggable implements IEventsCacheAsync {

  private readonly log: ILogger;
  private readonly wrapper: ICustomStorageWrapper;
  private readonly keys: KeyBuilderSS;
  private readonly metadata: IRedisMetadata;

  constructor(log: ILogger, keys: KeyBuilderSS, wrapper: ICustomStorageWrapper, metadata: IRedisMetadata) {
    this.log = log;
    this.keys = keys;
    this.wrapper = wrapper;
    this.metadata = metadata;
  }

  /**
   * Push given event to the storage.
   * @param eventData  Event item to push.
   * @returns  A promise that is resolved with a boolean value indicating if the push operation succeeded or failed.
   * The promise will never be rejected.
   */
  track(eventData: SplitIO.EventData): Promise<boolean> {
    return this.wrapper.pushItems(
      this.keys.buildEventsKey(),
      [this._toJSON(eventData)]
    )
      // We use boolean values to signal successful queueing
      .then(() => true)
      .catch(e => {
        this.log.error(LOG_PREFIX + ` Error adding event to queue: ${e}.`);
        return false;
      });
  }

  private _toJSON(eventData: SplitIO.EventData): string {
    return JSON.stringify({
      m: this.metadata,
      e: eventData
    });
  }

}
