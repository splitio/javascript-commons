import { LRUCache } from '..';

test('Check Cache', () => {
  const cache = new LRUCache(5);
  for (let i = 1; i <= 5; i++) {
    expect(cache.set(`key${i}`, i)).toBe(true);
  }

  for (let i = 1; i <= 5; i++) {
    expect(cache.get(`key${i}`)).toBe(i);
  }

  cache.set('key6', 6);
  // Oldest item (1) should have been removed
  expect(cache.get('key1')).toBe(undefined);

  // 2-6 should be available
  for (let i = 2; i <= 6; i++) {
    expect(cache.get(`key${i}`)).toBe(i);
  }

  expect(cache.items.size).toBe(5);

});
