import MySegmentsCache from '../MySegmentsCacheInMemory';

test('MY SEGMENTS CACHE / in memory', () => {
  const cache = new MySegmentsCache();

  cache.addToSegment('mocked-segment');

  expect(cache.isInSegment('mocked-segment') === true).toBe(true);

  cache.removeFromSegment('mocked-segment');

  expect(cache.isInSegment('mocked-segment') === false).toBe(true);

});
