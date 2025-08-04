import { ILogger } from '../../logger/types';
import { isNaNNumber } from '../../utils/lang';
import { AbstractMySegmentsCacheSync } from '../AbstractMySegmentsCacheSync';
import type { MySegmentsKeyBuilder } from '../KeyBuilderCS';
import { LOG_PREFIX, DEFINED } from './constants';
import { StorageAdapter } from '../types';

export class MySegmentsCacheInLocal extends AbstractMySegmentsCacheSync {

  private readonly keys: MySegmentsKeyBuilder;
  private readonly log: ILogger;
  private readonly storage: StorageAdapter;

  constructor(log: ILogger, keys: MySegmentsKeyBuilder, storage: StorageAdapter) {
    super();
    this.log = log;
    this.keys = keys;
    this.storage = storage;
    // There is not need to flush segments cache like splits cache, since resetSegments receives the up-to-date list of active segments
  }

  protected addSegment(name: string): boolean {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    try {
      if (this.storage.getItem(segmentKey) === DEFINED) return false;
      this.storage.setItem(segmentKey, DEFINED);
      return true;
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
      return false;
    }
  }

  protected removeSegment(name: string): boolean {
    const segmentKey = this.keys.buildSegmentNameKey(name);

    try {
      if (this.storage.getItem(segmentKey) !== DEFINED) return false;
      this.storage.removeItem(segmentKey);
      return true;
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
      return false;
    }
  }

  isInSegment(name: string): boolean {
    return this.storage.getItem(this.keys.buildSegmentNameKey(name)) === DEFINED;
  }

  getRegisteredSegments(): string[] {
    const registeredSegments: string[] = [];
    for (let i = 0, len = this.storage.length; i < len; i++) {
      const segmentName = this.keys.extractSegmentName(this.storage.key(i)!);
      if (segmentName) registeredSegments.push(segmentName);
    }
    return registeredSegments;
  }

  getKeysCount() {
    return 1;
  }

  protected setChangeNumber(changeNumber?: number) {
    try {
      if (changeNumber) this.storage.setItem(this.keys.buildTillKey(), changeNumber + '');
      else this.storage.removeItem(this.keys.buildTillKey());
    } catch (e) {
      this.log.error(e);
    }
  }

  getChangeNumber() {
    const n = -1;
    let value: string | number | null = this.storage.getItem(this.keys.buildTillKey());

    if (value !== null) {
      value = parseInt(value, 10);

      return isNaNNumber(value) ? n : value;
    }

    return n;
  }

}
