import { ImpressionDTO } from '../../types';
import LRUCache from '../../utils/LRUCache';
import { IImpressionObserver } from './types';

export default class ImpressionObserver<K extends string | number> implements IImpressionObserver {
  private cache: LRUCache<K, number>;
  private hasher: (impression: ImpressionDTO) => K;

  constructor(size: number, hasher: (impression: ImpressionDTO) => K) {
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
