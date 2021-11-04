import { ImpressionDTO } from '../../types';
import LRUCache from '../../utils/LRUCache';
import { IImpressionObserver } from './types';

export default class ImpressionObserver implements IImpressionObserver {
  private cache: LRUCache<string, number>;
  private hasher: (impression: ImpressionDTO) => string;

  constructor(size: number, hasher: (impression: ImpressionDTO) => string) {
    this.cache = new LRUCache(size);
    this.hasher = hasher;
  }

  testAndSet(impression: ImpressionDTO) {
    const hash = this.hasher(impression);
    const previous = this.cache.get(hash);
    this.cache.set(hash, impression.time);
    return previous;
  }
}
