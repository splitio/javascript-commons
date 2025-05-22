import { ILogger } from '../../logger/types';
import { isNaNNumber } from '../../utils/lang';
import { AbstractMySegmentsCacheSync } from '../AbstractMySegmentsCacheSync';
import type { MySegmentsKeyBuilder } from '../KeyBuilderCS';
import { LOG_PREFIX, DEFINED } from './constants';
import SplitIO from '../../../types/splitio';

export class MySegmentsCacheInLocal extends AbstractMySegmentsCacheSync {

  private readonly keys: MySegmentsKeyBuilder;
  private readonly log: ILogger;
  private readonly localStorage: SplitIO.Storage;

  constructor(log: ILogger, keys: MySegmentsKeyBuilder, localStorage: SplitIO.Storage) {
    super();
    this.log = log;
    this.keys = keys;
    this.localStorage = localStorage;
    // There is not need to flush segments cache like splits cache, since resetSegments receives the up-to-date list of active segments
  }

  protected addSegment(name: string): boolean {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    try {
      if (this.localStorage.getItem(segmentKey) === DEFINED) return false;
      this.localStorage.setItem(segmentKey, DEFINED);
      return true;
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
      return false;
    }
  }

  protected removeSegment(name: string): boolean {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    try {
      if (this.localStorage.getItem(segmentKey) !== DEFINED) return false;
      this.localStorage.removeItem(segmentKey);
      return true;
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
      return false;
    }
  }

  isInSegment(name: string): boolean {
    return this.localStorage.getItem(this.keys.buildSegmentNameKey(name)) === DEFINED;
  }

  getRegisteredSegments(): string[] {
    // Scan current values from localStorage
    return Object.keys(this.localStorage).reduce((accum, key) => {
      let segmentName = this.keys.extractSegmentName(key);

      if (segmentName) accum.push(segmentName);

      return accum;
    }, [] as string[]);
  }

  getKeysCount() {
    return 1;
  }

  protected setChangeNumber(changeNumber?: number) {
    try {
      if (changeNumber) this.localStorage.setItem(this.keys.buildTillKey(), changeNumber + '');
      else this.localStorage.removeItem(this.keys.buildTillKey());
    } catch (e) {
      this.log.error(e);
    }
  }

  getChangeNumber() {
    const n = -1;
    let value: string | number | null = this.localStorage.getItem(this.keys.buildTillKey());

    if (value !== null) {
      value = parseInt(value, 10);

      return isNaNNumber(value) ? n : value;
    }

    return n;
  }

}
