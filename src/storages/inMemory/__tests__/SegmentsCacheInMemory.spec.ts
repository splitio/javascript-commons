import { splitWithUserTT, splitWithAccountTT, parsedSplitWithSegments } from '../../__tests__/testUtils';
import SegmentsCache from '../SegmentsCacheInMemory';

describe('SEGMENTS CACHE IN MEMORY', () => {

  test('isInSegment, set/getChangeNumber, add/removeFromSegment', () => {
    // @ts-ignore
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

  test('get registered segments', async () => {
    const splitCacheWithoutSplits = {
      getAll() { return []; }
    };
    // @ts-expect-error
    let cache = new SegmentsCache(splitCacheWithoutSplits);
    expect(cache.getRegisteredSegments()).toEqual([]);

    const splitCacheWithoutSegments = {
      getAll() { return [splitWithUserTT, splitWithAccountTT]; }
    };
    // @ts-expect-error
    cache = new SegmentsCache(splitCacheWithoutSegments);
    expect(cache.getRegisteredSegments()).toEqual([]);

    const splitCacheWithSegments = {
      getAll() { return [JSON.stringify(parsedSplitWithSegments)]; }
    };
    // @ts-expect-error
    cache = new SegmentsCache(splitCacheWithSegments);
    expect(cache.getRegisteredSegments()).toEqual(['A', 'B']);
  });

});
