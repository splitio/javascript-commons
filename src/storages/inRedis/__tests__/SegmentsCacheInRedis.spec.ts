import { SegmentsCacheInRedis } from '../SegmentsCacheInRedis';
import { KeyBuilderSS } from '../../KeyBuilderSS';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { metadata } from '../../__tests__/KeyBuilder.spec';
import { RedisAdapter } from '../RedisAdapter';

const prefix = 'prefix';
const keys = new KeyBuilderSS(prefix, metadata);

describe('SEGMENTS CACHE IN REDIS', () => {

  test('isInSegment, set/getChangeNumber, add/removeFromSegment', async () => {
    const connection = new RedisAdapter(loggerMock);
    const cache = new SegmentsCacheInRedis(loggerMock, keys, connection);

    await cache.addToSegment('mocked-segment', ['a', 'b', 'c']);

    await cache.setChangeNumber('mocked-segment', 1);

    await cache.removeFromSegment('mocked-segment', ['d']);

    expect(await cache.getChangeNumber('mocked-segment') === 1).toBe(true);

    expect(await cache.getChangeNumber('inexistent-segment')).toBe(undefined); // -1 if the segment doesn't exist

    await cache.addToSegment('mocked-segment', ['d', 'e']);

    await cache.removeFromSegment('mocked-segment', ['a', 'c']);

    expect(await cache.getChangeNumber('mocked-segment') === 1).toBe(true);

    expect(await cache.isInSegment('mocked-segment', 'a')).toBe(false);
    expect(await cache.isInSegment('mocked-segment', 'b')).toBe(true);
    expect(await cache.isInSegment('mocked-segment', 'c')).toBe(false);
    expect(await cache.isInSegment('mocked-segment', 'd')).toBe(true);
    expect(await cache.isInSegment('mocked-segment', 'e')).toBe(true);

    // Teardown
    await connection.del(await connection.keys(`${prefix}.segment*`)); // @TODO use `cache.clear` method when implemented
    await connection.disconnect();
  });

  test('registerSegment / getRegisteredSegments', async () => {
    const connection = new RedisAdapter(loggerMock);
    const cache = new SegmentsCacheInRedis(loggerMock, keys, connection);

    await cache.registerSegments(['s1']);
    await cache.registerSegments(['s2']);
    await cache.registerSegments(['s2', 's3', 's4']);

    const segments = await cache.getRegisteredSegments();

    ['s1', 's2', 's3', 's4'].forEach(s => expect(segments.indexOf(s) !== -1).toBe(true));

    // Teardown
    await connection.del(await connection.keys(`${prefix}.segment*`)); // @TODO use `cache.clear` method when implemented
    await connection.disconnect();
  });

});
