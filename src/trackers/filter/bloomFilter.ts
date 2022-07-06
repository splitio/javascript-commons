import { BloomFilter } from 'bloom-filters';
import { IFilter } from './types';

export class BloomFilterImp implements IFilter {
  
  private spectedInsertions: number;
  private errorRate: number;
  private filter: BloomFilter;
  
  constructor(spectedInsertions: number, errorRate: number) {
    this.spectedInsertions = spectedInsertions;
    this.errorRate = errorRate;
    this.filter = BloomFilter.create(spectedInsertions, errorRate);
  }

  add(data: string): boolean {
    try {
      this.filter.add(data);
      return true;
    } catch {
      return false;
    }
  }
  
  contains(data: string): boolean {
    return this.filter.has(data);
  }
  
  clear(): void {
    this.filter = BloomFilter.create(this.spectedInsertions, this.errorRate);
  }
}
