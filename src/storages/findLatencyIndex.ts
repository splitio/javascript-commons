import { isNaNNumber } from '../utils/lang';

const MIN = 0;
const MAX = 22;
const BASE = 1.5;

/**
 * Calculates buckets from latency in milliseconds
 *
 * @param latencyInMs
 * @returns a bucket index from 0 to 22 inclusive
 */
export function findLatencyIndex(latencyInMs: number): number {
  const index = Math.min(MAX, Math.max(MIN, Math.ceil(Math.log(latencyInMs) / Math.log(BASE))));
  return isNaNNumber(index) ? 0 : index; // index is NaN if latency is not a positive number
}
