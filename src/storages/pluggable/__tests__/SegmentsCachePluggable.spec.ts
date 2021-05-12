import { SegmentsCachePluggable } from '../SegmentsCachePluggable';
import KeyBuilder from '../../KeyBuilder';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { wrapperMock } from './wrapper.mock';
import { splitWithUserTT, splitWithAccountTT, parsedSplitWithSegments } from '../../__tests__/testUtils';

const keyBuilder = new KeyBuilder();

describe('SEGMENTS CACHE PLUGGABLE', () => {

  afterEach(() => {
    loggerMock.mockClear();
    wrapperMock.mockClear();
  });

  test('isInSegment, set/getChangeNumber', async () => {
    // @ts-ignore
    const cache = new SegmentsCachePluggable(loggerMock, keyBuilder, wrapperMock);

    await cache.addToSegment('mocked-segment', ['a', 'b', 'c']);

    await cache.setChangeNumber('mocked-segment', 1);

    await cache.removeFromSegment('mocked-segment', ['d']);

    expect(await cache.getChangeNumber('mocked-segment') === 1).toBe(true);

    expect(await cache.getChangeNumber('inexistent-segment')).toBe(-1); // -1 if the segment doesn't exist

    await cache.addToSegment('mocked-segment', ['d', 'e']);

    await cache.removeFromSegment('mocked-segment', ['a', 'c']);

    expect(await cache.getChangeNumber('mocked-segment') === 1).toBe(true);

    expect(await cache.isInSegment('mocked-segment', 'a')).toBe(false);
    expect(await cache.isInSegment('mocked-segment', 'b')).toBe(true);
    expect(await cache.isInSegment('mocked-segment', 'c')).toBe(false);
    expect(await cache.isInSegment('mocked-segment', 'd')).toBe(true);
    expect(await cache.isInSegment('mocked-segment', 'e')).toBe(true);

    expect(await cache.isInSegment('inexistent-segment', 'a')).toBe(false);
  });

  test('get registered segments', async () => {
    const splitCacheWithoutSplits = {
      getAll() { return Promise.resolve([]); }
    };
    // @ts-expect-error
    let cache = new SegmentsCachePluggable(loggerMock, keyBuilder, wrapperMock, splitCacheWithoutSplits);
    expect(await cache.getRegisteredSegments()).toEqual([]);

    const splitCacheWithoutSegments = {
      getAll() { return Promise.resolve([splitWithUserTT, splitWithAccountTT]); }
    };
    // @ts-expect-error
    cache = new SegmentsCachePluggable(loggerMock, keyBuilder, wrapperMock, splitCacheWithoutSegments);
    expect(await cache.getRegisteredSegments()).toEqual([]);

    const splitCacheWithSegments = {
      getAll() { return Promise.resolve([JSON.stringify(parsedSplitWithSegments)]); }
    };
    // @ts-expect-error
    cache = new SegmentsCachePluggable(loggerMock, keyBuilder, wrapperMock, splitCacheWithSegments);
    expect(await cache.getRegisteredSegments()).toEqual(['A', 'B']);
  });

});
