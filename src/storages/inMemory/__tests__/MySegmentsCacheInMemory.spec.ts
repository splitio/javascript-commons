import { MySegmentsCacheInMemory } from '../MySegmentsCacheInMemory';

test('MY SEGMENTS CACHE / in memory', () => {
  const cache = new MySegmentsCacheInMemory();

  expect(cache.resetSegments(['mocked-segment', 'mocked-segment-2'], 123)).toBe(true);
  expect(cache.getChangeNumber()).toBe(123);
  expect(cache.resetSegments(['mocked-segment', 'mocked-segment-2'])).toBe(false);
  expect(cache.getChangeNumber()).toBe(-1);

  expect(cache.isInSegment('mocked-segment')).toBe(true);
  expect(cache.getRegisteredSegments()).toEqual(['mocked-segment', 'mocked-segment-2']);
  expect(cache.getKeysCount()).toBe(1);

  expect(cache.resetSegments(['mocked-segment-2'], 150)).toBe(true);

  expect(cache.isInSegment('mocked-segment')).toBe(false);
  expect(cache.getRegisteredSegments()).toEqual(['mocked-segment-2']);
  expect(cache.getKeysCount()).toBe(1);

  cache.clear();
  expect(cache.getRegisteredSegments()).toEqual([]);
  expect(cache.getChangeNumber()).toBe(-1);
});
