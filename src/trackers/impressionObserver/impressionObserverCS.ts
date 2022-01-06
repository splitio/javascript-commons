import { ImpressionObserver } from './ImpressionObserver';
import { hash } from '../../utils/murmur3/murmur3';
import { buildKey } from './buildKey';
import { ImpressionDTO } from '../../types';

export function hashImpression32(impression: ImpressionDTO) {
  return hash(buildKey(impression));
}

const LAST_SEEN_CACHE_SIZE = 500; // cache up to 500 impression hashes

export function impressionObserverCSFactory() {
  return new ImpressionObserver(LAST_SEEN_CACHE_SIZE, hashImpression32);
}
