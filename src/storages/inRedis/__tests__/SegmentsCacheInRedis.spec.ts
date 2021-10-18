import Redis from 'ioredis';
import SegmentsCacheInRedis from '../SegmentsCacheInRedis';
import KeyBuilderSS from '../../KeyBuilderSS';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

// @ts-expect-error. Doesn't require metadata
const keys = new KeyBuilderSS();

describe('SEGMENTS CACHE IN REDIS', () => {

  test('isInSegment, set/getChangeNumber, add/removeFromSegment', async () => {
    const connection = new Redis();
    const cache = new SegmentsCacheInRedis(loggerMock, keys, connection);

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

  test('registerSegment / getRegisteredSegments', async () => {
    const connection = new Redis();
    const cache = new SegmentsCacheInRedis(loggerMock, keys, connection);

    await cache.clear();

    await cache.registerSegments(['s1']);
    await cache.registerSegments(['s2']);
    await cache.registerSegments(['s2', 's3', 's4']);

    const segments = await cache.getRegisteredSegments();

    ['s1', 's2', 's3', 's4'].forEach(s => expect(segments.indexOf(s) !== -1).toBe(true));

    await connection.quit();
  });

});
