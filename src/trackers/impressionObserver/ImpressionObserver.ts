import { ImpressionDTO } from '../../types';
import LRUCache from '../../utils/LRUCache';
import { IImpressionObserver } from './types';

export default class ImpressionObserver implements IImpressionObserver {
  private cache: LRUCache<string | null, number>;
  private hasher: (impression: ImpressionDTO) => string | null;

  constructor(size: number, hasher: (impression: ImpressionDTO) => string | null) {
    this.cache = new LRUCache(size);
    this.hasher = hasher;
  }

  testAndSet(impression: ImpressionDTO) {
    if (!impression) return;

    const hash = this.hasher(impression);
    const previous = this.cache.get(hash);
    this.cache.set(hash, impression.time);
    return previous;
  }
}
