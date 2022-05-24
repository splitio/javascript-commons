import { SegmentsCacheInMemory } from '../SegmentsCacheInMemory';

describe('SEGMENTS CACHE IN MEMORY', () => {

  test('isInSegment, set/getChangeNumber, add/removeFromSegment, getKeysCount', () => {
    const cache = new SegmentsCacheInMemory();

    cache.addToSegment('mocked-segment', [
      'a', 'b', 'c'
    ]);

    cache.setChangeNumber('mocked-segment', 1);

    cache.removeFromSegment('mocked-segment', ['d']);

    expect(cache.getChangeNumber('mocked-segment') === 1).toBe(true);

    cache.addToSegment('mocked-segment', ['d', 'e']);

    cache.removeFromSegment('mocked-segment', ['a', 'c']);

    expect(cache.getChangeNumber('mocked-segment') === 1).toBe(true);

    expect(cache.isInSegment('mocked-segment', 'a')).toBe(false);
    expect(cache.isInSegment('mocked-segment', 'b')).toBe(true); // b
    expect(cache.isInSegment('mocked-segment', 'c')).toBe(false); // c
    expect(cache.isInSegment('mocked-segment', 'd')).toBe(true); // d
    expect(cache.isInSegment('mocked-segment', 'e')).toBe(true); // e

    // getKeysCount
    expect(cache.getKeysCount()).toBe(3);
    cache.addToSegment('mocked-segment-2', ['a', 'b', 'c', 'd', 'e']);
    expect(cache.getKeysCount()).toBe(8);
    cache.clear();
    expect(cache.getKeysCount()).toBe(0);
  });

  test('registerSegment / getRegisteredSegments', async () => {
    const cache = new SegmentsCacheInMemory();

    await cache.registerSegments(['s1']);
    await cache.registerSegments(['s2']);
    await cache.registerSegments(['s2', 's3', 's4']);

    const segments = cache.getRegisteredSegments();

    ['s1', 's2', 's3', 's4'].forEach(s => expect(segments.indexOf(s) !== -1).toBe(true));
  });

});
