import { ImpressionObserver } from './ImpressionObserver';
import { hash128 } from '../../utils/murmur3/murmur3_128_x86';
import { buildKey } from './buildKey';
import { ImpressionDTO } from '../../types';

export function hashImpression128(impression: ImpressionDTO) {
  return hash128(buildKey(impression));
}

const LAST_SEEN_CACHE_SIZE = 500000; // cache up to 500k impression hashes

export function impressionObserverSSFactory() {
  return new ImpressionObserver(LAST_SEEN_CACHE_SIZE, hashImpression128);
}
