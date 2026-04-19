import { bloomFilterFactory } from '../bloomFilter';

describe('Bloom filter', () => {

  test('should add and check membership correctly', () => {
    const bloomFilter = bloomFilterFactory();

    expect(bloomFilter.add('feature', 'key')).toBe(true);
    expect(bloomFilter.contains('feature1', 'key')).toBe(false);
    expect(bloomFilter.contains('feature', 'key')).toBe(true);
  });

  test('should clear the filter', () => {
    const bloomFilter = bloomFilterFactory();

    bloomFilter.add('feature', 'key');
    bloomFilter.clear();

    expect(bloomFilter.contains('feature', 'key')).toBe(false);
  });

  test('should work after clear with new entries', () => {
    const bloomFilter = bloomFilterFactory();

    bloomFilter.add('feature', 'key');
    bloomFilter.clear();

    expect(bloomFilter.add('feature2', 'key')).toBe(true);
    expect(bloomFilter.contains('feature3', 'key')).toBe(false);
    expect(bloomFilter.contains('feature2', 'key')).toBe(true);
  });

});
