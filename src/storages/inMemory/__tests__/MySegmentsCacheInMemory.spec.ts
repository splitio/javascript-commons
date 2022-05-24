import { MySegmentsCacheInMemory } from '../MySegmentsCacheInMemory';

test('MY SEGMENTS CACHE / in memory', () => {
  const cache = new MySegmentsCacheInMemory();

  cache.addToSegment('mocked-segment');
  cache.addToSegment('mocked-segment-2');

  expect(cache.isInSegment('mocked-segment')).toBe(true);
  expect(cache.getRegisteredSegments()).toEqual(['mocked-segment', 'mocked-segment-2']);
  expect(cache.getKeysCount()).toBe(1);

  cache.removeFromSegment('mocked-segment');

  expect(cache.isInSegment('mocked-segment')).toBe(false);
  expect(cache.getRegisteredSegments()).toEqual(['mocked-segment-2']);
  expect(cache.getKeysCount()).toBe(1);

});
