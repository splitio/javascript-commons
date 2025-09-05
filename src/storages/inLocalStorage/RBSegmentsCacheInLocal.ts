import { IRBSegment } from '../../dtos/types';
import { ILogger } from '../../logger/types';
import { ISettings } from '../../types';
import { isFiniteNumber, isNaNNumber, toNumber } from '../../utils/lang';
import { setToArray } from '../../utils/lang/sets';
import { usesSegments } from '../AbstractSplitsCacheSync';
import { KeyBuilderCS } from '../KeyBuilderCS';
import { IRBSegmentsCacheSync } from '../types';
import { LOG_PREFIX } from './constants';

export class RBSegmentsCacheInLocal implements IRBSegmentsCacheSync {

  private readonly keys: KeyBuilderCS;
  private readonly log: ILogger;

  constructor(settings: ISettings, keys: KeyBuilderCS) {
    this.keys = keys;
    this.log = settings.log;
  }

  clear() {
    this.getNames().forEach(name => this.remove(name));
    localStorage.removeItem(this.keys.buildRBSegmentsTillKey());
  }

  update(toAdd: IRBSegment[], toRemove: IRBSegment[], changeNumber: number): boolean {
    this.setChangeNumber(changeNumber);
    const updated = toAdd.map(toAdd => this.add(toAdd)).some(result => result);
    return toRemove.map(toRemove => this.remove(toRemove.name)).some(result => result) || updated;
  }

  private setChangeNumber(changeNumber: number) {
    try {
      localStorage.setItem(this.keys.buildRBSegmentsTillKey(), changeNumber + '');
      localStorage.setItem(this.keys.buildLastUpdatedKey(), Date.now() + '');
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
    }
  }

  private updateSegmentCount(diff: number) {
    const segmentsCountKey = this.keys.buildSplitsWithSegmentCountKey();
    const count = toNumber(localStorage.getItem(segmentsCountKey)) + diff;
    // @ts-expect-error
    if (count > 0) localStorage.setItem(segmentsCountKey, count);
    else localStorage.removeItem(segmentsCountKey);
  }

  private add(rbSegment: IRBSegment): boolean {
    try {
      const name = rbSegment.name;
      const rbSegmentKey = this.keys.buildRBSegmentKey(name);
      const rbSegmentFromLocalStorage = localStorage.getItem(rbSegmentKey);
      const previous = rbSegmentFromLocalStorage ? JSON.parse(rbSegmentFromLocalStorage) : null;

      localStorage.setItem(rbSegmentKey, JSON.stringify(rbSegment));

      let usesSegmentsDiff = 0;
      if (previous && usesSegments(previous)) usesSegmentsDiff--;
      if (usesSegments(rbSegment)) usesSegmentsDiff++;
      if (usesSegmentsDiff !== 0) this.updateSegmentCount(usesSegmentsDiff);

      return true;
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
      return false;
    }
  }

  private remove(name: string): boolean {
    try {
      const rbSegment = this.get(name);
      if (!rbSegment) return false;

      localStorage.removeItem(this.keys.buildRBSegmentKey(name));

      if (usesSegments(rbSegment)) this.updateSegmentCount(-1);

      return true;
    } catch (e) {
      this.log.error(LOG_PREFIX + e);
      return false;
    }
  }

  private getNames(): string[] {
    const len = localStorage.length;
    const accum = [];

    let cur = 0;

    while (cur < len) {
      const key = localStorage.key(cur);

      if (key != null && this.keys.isRBSegmentKey(key)) accum.push(this.keys.extractKey(key));

      cur++;
    }

    return accum;
  }

  get(name: string): IRBSegment | null {
    const item = localStorage.getItem(this.keys.buildRBSegmentKey(name));
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
    let value: string | number | null = localStorage.getItem(this.keys.buildRBSegmentsTillKey());

    if (value !== null) {
      value = parseInt(value, 10);

      return isNaNNumber(value) ? n : value;
    }

    return n;
  }

  usesSegments(): boolean {
    const storedCount = localStorage.getItem(this.keys.buildSplitsWithSegmentCountKey());
    const splitsWithSegmentsCount = storedCount === null ? 0 : toNumber(storedCount);

    return isFiniteNumber(splitsWithSegmentsCount) ?
      splitsWithSegmentsCount > 0 :
      true;
  }

}
