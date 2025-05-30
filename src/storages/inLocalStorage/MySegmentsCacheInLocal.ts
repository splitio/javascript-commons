import { ILogger } from '../../logger/types';
import { isNaNNumber } from '../../utils/lang';
import { AbstractMySegmentsCacheSync } from '../AbstractMySegmentsCacheSync';
import type { MySegmentsKeyBuilder } from '../KeyBuilderCS';
import { LOG_PREFIX, DEFINED } from './constants';

export class MySegmentsCacheInLocal extends AbstractMySegmentsCacheSync {

  private readonly keys: MySegmentsKeyBuilder;
  private readonly log: ILogger;

  constructor(log: ILogger, keys: MySegmentsKeyBuilder) {
    super();
    this.log = log;
    this.keys = keys;
    // There is not need to flush segments cache like splits cache, since resetSegments receives the up-to-date list of active segments
  }

  protected addSegment(name: string): boolean {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    try {
      if (localStorage.getItem(segmentKey) === DEFINED) return false;
      localStorage.setItem(segmentKey, DEFINED);
      return true;
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
      return false;
    }
  }

  protected removeSegment(name: string): boolean {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    try {
      if (localStorage.getItem(segmentKey) !== DEFINED) return false;
      localStorage.removeItem(segmentKey);
      return true;
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
      return false;
    }
  }

  isInSegment(name: string): boolean {
    return localStorage.getItem(this.keys.buildSegmentNameKey(name)) === DEFINED;
  }

  protected getSegments(): string[] {
    // Scan current values from localStorage
    return Object.keys(localStorage).reduce((accum, key) => {
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
      if (changeNumber) localStorage.setItem(this.keys.buildTillKey(), changeNumber + '');
      else localStorage.removeItem(this.keys.buildTillKey());
    } catch (e) {
      this.log.error(e);
    }
  }

  getChangeNumber() {
    const n = -1;
    let value: string | number | null = localStorage.getItem(this.keys.buildTillKey());

    if (value !== null) {
      value = parseInt(value, 10);

      return isNaNNumber(value) ? n : value;
    }

    return n;
  }

}
