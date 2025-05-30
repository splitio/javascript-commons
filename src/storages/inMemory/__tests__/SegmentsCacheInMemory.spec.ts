import { SegmentsCacheInMemory } from '../SegmentsCacheInMemory';

describe('SEGMENTS CACHE IN MEMORY', () => {

  test('isInSegment, getChangeNumber, update, getKeysCount', () => {
    const cache = new SegmentsCacheInMemory();

    cache.update('mocked-segment', [ 'a', 'b', 'c'], [], 1);
    cache.update('mocked-segment', [], ['d'], 1);

    expect(cache.getChangeNumber('mocked-segment') === 1).toBe(true);

    cache.update('mocked-segment', [ 'd', 'e'], [], 2);
    cache.update('mocked-segment', [], ['a', 'c'], 2);

    expect(cache.getChangeNumber('mocked-segment') === 2).toBe(true);

    expect(cache.isInSegment('mocked-segment', 'a')).toBe(false);
    expect(cache.isInSegment('mocked-segment', 'b')).toBe(true); // b
    expect(cache.isInSegment('mocked-segment', 'c')).toBe(false); // c
    expect(cache.isInSegment('mocked-segment', 'd')).toBe(true); // d
    expect(cache.isInSegment('mocked-segment', 'e')).toBe(true); // e

    // getKeysCount
    expect(cache.getKeysCount()).toBe(3);
    cache.update('mocked-segment-2', ['a', 'b', 'c', 'd', 'e'], [], 2);
    expect(cache.getKeysCount()).toBe(8);
    cache.clear();
    expect(cache.getKeysCount()).toBe(0);
  });

});
