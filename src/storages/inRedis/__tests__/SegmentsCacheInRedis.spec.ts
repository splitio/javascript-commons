import Redis from 'ioredis';
import SegmentsCacheInRedis from '../SegmentsCacheInRedis';
import KeyBuilderSS from '../../KeyBuilderSS';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { splitWithUserTT, splitWithAccountTT, parsedSplitWithSegments } from '../../__tests__/testUtils';

describe('SEGMENTS CACHE IN REDIS', () => {

  test('isInSegment, set/getChangeNumber, add/removeFromSegment', async () => {
    const connection = new Redis();

    // @ts-expect-error
    const cache = new SegmentsCacheInRedis(loggerMock, new KeyBuilderSS(), connection);

    await cache.clear();

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

    await connection.quit();
  });

  test('get registered segments', async () => {
    const splitCacheWithoutSplits = {
      getAll() { return Promise.resolve([]); }
    };
    // @ts-expect-error
    let cache = new SegmentsCacheInRedis(loggerMock, new KeyBuilderSS(), undefined, splitCacheWithoutSplits);
    expect(await cache.getRegisteredSegments()).toEqual([]);

    const splitCacheWithoutSegments = {
      getAll() { return Promise.resolve([splitWithUserTT, splitWithAccountTT]); }
    };
    // @ts-expect-error
    cache = new SegmentsCacheInRedis(loggerMock, new KeyBuilderSS(), undefined, splitCacheWithoutSegments);
    expect(await cache.getRegisteredSegments()).toEqual([]);

    const splitCacheWithSegments = {
      getAll() { return Promise.resolve([JSON.stringify(parsedSplitWithSegments)]); }
    };
    // @ts-expect-error
    cache = new SegmentsCacheInRedis(loggerMock, new KeyBuilderSS(), undefined, splitCacheWithSegments);
    expect(await cache.getRegisteredSegments()).toEqual(['A', 'B']);
  });

});
