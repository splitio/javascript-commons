import { IRBSegment } from '../../dtos/types';
import { setToArray } from '../../utils/lang/sets';
import { usesSegments } from '../AbstractSplitsCacheSync';
import { IRBSegmentsCacheSync } from '../types';

export class RBSegmentsCacheInMemory implements IRBSegmentsCacheSync {

  private cache: Record<string, IRBSegment> = {};
  private changeNumber: number = -1;
  private segmentsCount: number = 0;

  clear() {
    this.cache = {};
    this.changeNumber = -1;
    this.segmentsCount = 0;
  }

  update(toAdd: IRBSegment[], toRemove: IRBSegment[], changeNumber: number): boolean {
    let updated = toAdd.map(toAdd => this.add(toAdd)).some(result => result);
    updated = toRemove.map(toRemove => this.remove(toRemove.name)).some(result => result) || updated;
    this.changeNumber = changeNumber;
    return updated;
  }

  private add(rbSegment: IRBSegment): boolean {
    const name = rbSegment.name;
    const previous = this.get(name);
    if (previous && usesSegments(previous)) this.segmentsCount--;

    this.cache[name] = rbSegment;
    if (usesSegments(rbSegment)) this.segmentsCount++;

    return true;
  }

  private remove(name: string): boolean {
    const rbSegment = this.get(name);
    if (!rbSegment) return false;

    delete this.cache[name];

    if (usesSegments(rbSegment)) this.segmentsCount--;

    return true;
  }

  private getNames(): string[] {
    return Object.keys(this.cache);
  }

  get(name: string): IRBSegment | null {
    return this.cache[name] || null;
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
    return this.changeNumber;
  }

  usesSegments(): boolean {
    return this.segmentsCount > 0;
  }

}
