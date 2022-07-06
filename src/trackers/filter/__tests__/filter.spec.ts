import { BloomFilterImp } from '../bloomFilter'
import { DictionaryFilter } from '../dictionaryFilter'
import { IFilter } from '../types';

function assertFilter(filter: IFilter) {
  expect(filter.add('func_test1')).toBe(true);
  expect(filter.contains('func_test2')).toBe(false);
  expect(filter.contains('func_test1')).toBe(true);
}

test('Bloom filter and Dictionary filter', () => { 
  
  const bloomFilter = new BloomFilterImp(5000, 0.01);
  
  expect(bloomFilter.add('test1')).toBe(true);
  expect(bloomFilter.contains('test2')).toBe(false);
  expect(bloomFilter.contains('test1')).toBe(true);
  
  assertFilter(bloomFilter);
  
  bloomFilter.clear();
  
  expect(bloomFilter.contains('test1')).toBe(false);
  
  const dictionaryFilter = new DictionaryFilter();
  
  expect(dictionaryFilter.add('test3')).toBe(true);
  expect(dictionaryFilter.contains('test2')).toBe(false);
  expect(dictionaryFilter.contains('test3')).toBe(true);
  
  assertFilter(dictionaryFilter);
  
  dictionaryFilter.clear();
  
  expect(dictionaryFilter.contains('test3')).toBe(false);
  
});
