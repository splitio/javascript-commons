// bloom-filters is supported on the following platforms:
// - Node.js: v4.0.0 or higher
// - Google Chrome: v41 or higher
// - Mozilla Firefox: v34 or higher
// - Microsoft Edge: v12 or higher
import { BloomFilter } from 'bloom-filters';

const EXPECTED_INSERTIONS = 10000000;
const ERROR_RATE = 0.01;
const REFRESH_RATE = 24 * 60 * 60000; // 24HS

export function bloomFilterFactory(expectedInsertions = EXPECTED_INSERTIONS, errorRate = ERROR_RATE, refreshRate = REFRESH_RATE) {
  let filter = BloomFilter.create(expectedInsertions, errorRate);

  return {

    refreshRate: refreshRate,

    add(key: string, value: string) {
      const data = `${key}:${value}`;
      if (filter.has(data)) {
        return false;
      }
      filter.add(data);
      return true;
    },

    contains(key: string, value: string) {
      const data = `${key}:${value}`;
      return filter.has(data);
    },

    clear() {
      filter = BloomFilter.create(expectedInsertions, errorRate);
    }

  };
}
