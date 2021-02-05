import SegmentsCache from '../SegmentsCacheInMemory';

test('SEGMENTS CACHE / in memory', () => {
  const cache = new SegmentsCache();

  cache.addToSegment('mocked-segment', [
    'a', 'b', 'c'
  ]);

  cache.setChangeNumber('mocked-segment', 1);

  cache.removeFromSegment('mocked-segment', [
    'd'
  ]);

  expect(cache.getChangeNumber('mocked-segment') === 1).toBe(true);

  cache.addToSegment('mocked-segment', [
    'd', 'e'
  ]);

  cache.removeFromSegment('mocked-segment', [
    'a', 'c'
  ]);

  expect(cache.getChangeNumber('mocked-segment') === 1).toBe(true);

  expect(cache.isInSegment('mocked-segment', 'a')).toBe(false);
  expect(cache.isInSegment('mocked-segment', 'b')).toBe(true); // b
  expect(cache.isInSegment('mocked-segment', 'c')).toBe(false); // c
  expect(cache.isInSegment('mocked-segment', 'd')).toBe(true); // d
  expect(cache.isInSegment('mocked-segment', 'e')).toBe(true); // e
});
