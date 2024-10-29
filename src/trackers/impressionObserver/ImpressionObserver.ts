import SplitIO from '../../../types/splitio';
import { LRUCache } from '../../utils/LRUCache';
import { IImpressionObserver } from './types';

export class ImpressionObserver<K extends string | number = string> implements IImpressionObserver {
  private cache: LRUCache<K, number>;
  private hasher: (impression: SplitIO.ImpressionDTO) => K;

  constructor(size: number, hasher: (impression: SplitIO.ImpressionDTO) => K) {
    this.cache = new LRUCache(size);
    this.hasher = hasher;
  }

  testAndSet(impression: SplitIO.ImpressionDTO) {
    const hash = this.hasher(impression);
    const previous = this.cache.get(hash);
    this.cache.set(hash, impression.time);
    return previous;
  }
}
