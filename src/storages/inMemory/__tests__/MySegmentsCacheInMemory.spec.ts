import { MySegmentsCacheInMemory } from '../MySegmentsCacheInMemory';

test('MY SEGMENTS CACHE / in memory', () => {
  const cache = new MySegmentsCacheInMemory();

  expect(cache.resetSegments({ k: [{ n: 'mocked-segment' }, { n: 'mocked-segment-2' }], cn: 123 })).toBe(true);
  expect(cache.getChangeNumber()).toBe(123);
  expect(cache.resetSegments({ k: [{ n: 'mocked-segment' }, { n: 'mocked-segment-2' }] })).toBe(false);
  expect(cache.getChangeNumber()).toBe(-1);

  expect(cache.isInSegment('mocked-segment')).toBe(true);
  expect(cache.getKeysCount()).toBe(1);

  expect(cache.resetSegments({ k: [{ n: 'mocked-segment-2' }], cn: 150})).toBe(true);

  expect(cache.isInSegment('mocked-segment')).toBe(false);
  expect(cache.getKeysCount()).toBe(1);

  cache.clear();
  expect(cache.getChangeNumber()).toBe(-1);
});
