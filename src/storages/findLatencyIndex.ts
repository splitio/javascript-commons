import { isNaNNumber } from '../utils/lang';

// @TODO add unit tests
export function findLatencyIndex(latency: number, min = 0, max = 23, base = 1.5): number {
  const index = Math.min(max, Math.max(min, Math.floor(Math.log(latency) / Math.log(base))));
  return isNaNNumber(index) ? 0 : index; // index is NaN if latency is not a positive number
}
