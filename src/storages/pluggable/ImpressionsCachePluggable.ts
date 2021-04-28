import { ICustomStorageWrapper, IImpressionsCacheAsync } from '../types';
import { IRedisMetadata } from '../../dtos/types';
import { ImpressionDTO } from '../../types';
import KeyBuilderSS from '../KeyBuilderSS';
import { ILogger } from '../../logger/types';
import { logPrefix } from './constants';

export class ImpressionsCachePluggable implements IImpressionsCacheAsync {

  private readonly log: ILogger;
  private readonly keys: KeyBuilderSS;
  private readonly wrapper: ICustomStorageWrapper;
  private readonly metadata: IRedisMetadata;

  constructor(log: ILogger, keys: KeyBuilderSS, wrapper: ICustomStorageWrapper, metadata: IRedisMetadata) {
    this.log = log;
    this.keys = keys;
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
      this.keys.buildImpressionsKey(),
      this._toJSON(impressions)
    ).catch((e) => {
      this.log.error(logPrefix + ` Error adding event to queue: ${e}.`);
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
      });
    });
  }

  // @TODO implement producer methods

}
