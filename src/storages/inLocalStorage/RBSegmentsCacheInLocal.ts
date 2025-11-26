import { IRBSegment } from '../../dtos/types';
import { ILogger } from '../../logger/types';
import { ISettings } from '../../types';
import { isFiniteNumber, isNaNNumber, toNumber } from '../../utils/lang';
import { setToArray } from '../../utils/lang/sets';
import { usesSegments } from '../AbstractSplitsCacheSync';
import { KeyBuilderCS } from '../KeyBuilderCS';
import { IRBSegmentsCacheSync, StorageAdapter } from '../types';
import { LOG_PREFIX } from './constants';

export class RBSegmentsCacheInLocal implements IRBSegmentsCacheSync {

  private readonly keys: KeyBuilderCS;
  private readonly log: ILogger;
  private readonly storage: StorageAdapter;

  constructor(settings: ISettings, keys: KeyBuilderCS, storage: StorageAdapter) {
    this.keys = keys;
    this.log = settings.log;
    this.storage = storage;
  }

  clear() {
    this.getNames().forEach(name => this.remove(name));
    this.storage.removeItem(this.keys.buildRBSegmentsTillKey());
  }

  update(toAdd: IRBSegment[], toRemove: IRBSegment[], changeNumber: number): boolean {
    let updated = toAdd.map(toAdd => this.add(toAdd)).some(result => result);
    updated = toRemove.map(toRemove => this.remove(toRemove.name)).some(result => result) || updated;
    this.setChangeNumber(changeNumber);
    return updated;
  }

  private setChangeNumber(changeNumber: number) {
    try {
      this.storage.setItem(this.keys.buildRBSegmentsTillKey(), changeNumber + '');
      this.storage.setItem(this.keys.buildLastUpdatedKey(), Date.now() + '');
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
    }
  }

  private updateSegmentCount(diff: number) {
    const segmentsCountKey = this.keys.buildSplitsWithSegmentCountKey();
    const count = toNumber(this.storage.getItem(segmentsCountKey)) + diff;
    if (count > 0) this.storage.setItem(segmentsCountKey, count + '');
    else this.storage.removeItem(segmentsCountKey);
  }

  private add(rbSegment: IRBSegment): boolean {
    const name = rbSegment.name;
    const rbSegmentKey = this.keys.buildRBSegmentKey(name);
    const rbSegmentFromStorage = this.storage.getItem(rbSegmentKey);
    const previous = rbSegmentFromStorage ? JSON.parse(rbSegmentFromStorage) : null;

    this.storage.setItem(rbSegmentKey, JSON.stringify(rbSegment));

    let usesSegmentsDiff = 0;
    if (previous && usesSegments(previous)) usesSegmentsDiff--;
    if (usesSegments(rbSegment)) usesSegmentsDiff++;
    if (usesSegmentsDiff !== 0) this.updateSegmentCount(usesSegmentsDiff);

    return true;
  }

  private remove(name: string): boolean {
    const rbSegment = this.get(name);
    if (!rbSegment) return false;

    this.storage.removeItem(this.keys.buildRBSegmentKey(name));

    if (usesSegments(rbSegment)) this.updateSegmentCount(-1);

    return true;
  }

  private getNames(): string[] {
    const len = this.storage.length;
    const accum = [];

    let cur = 0;

    while (cur < len) {
      const key = this.storage.key(cur);

      if (key != null && this.keys.isRBSegmentKey(key)) accum.push(this.keys.extractKey(key));

      cur++;
    }

    return accum;
  }

  get(name: string): IRBSegment | null {
    const item = this.storage.getItem(this.keys.buildRBSegmentKey(name));
    return item && JSON.parse(item);
  }

  getAll(): IRBSegment[] {
    return this.getNames().map(key => this.get(key)!);
  }

  contains(names: Set<string>): boolean {
    const namesArray = setToArray(names);
    const namesInStorage = this.getNames();
    return namesArray.every(name => namesInStorage.indexOf(name) !== -1);
  }

  getChangeNumber(): number {
    const n = -1;
    let value: string | number | null = this.storage.getItem(this.keys.buildRBSegmentsTillKey());

    if (value !== null) {
      value = parseInt(value, 10);

      return isNaNNumber(value) ? n : value;
    }

    return n;
  }

  usesSegments(): boolean {
    const storedCount = this.storage.getItem(this.keys.buildSplitsWithSegmentCountKey());
    const splitsWithSegmentsCount = storedCount === null ? 0 : toNumber(storedCount);

    return isFiniteNumber(splitsWithSegmentsCount) ?
      splitsWithSegmentsCount > 0 :
      true;
  }

}
