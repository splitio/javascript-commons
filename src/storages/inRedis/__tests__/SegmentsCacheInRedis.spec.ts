import { SegmentsCacheInRedis } from '../SegmentsCacheInRedis';
import { KeyBuilderSS } from '../../KeyBuilderSS';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { metadata } from '../../__tests__/KeyBuilder.spec';
import { RedisAdapter } from '../RedisAdapter';

const prefix = 'prefix';
const keys = new KeyBuilderSS(prefix, metadata);

describe('SEGMENTS CACHE IN REDIS', () => {

  test('isInSegment, getChangeNumber, update', async () => {
    const connection = new RedisAdapter(loggerMock);
    const cache = new SegmentsCacheInRedis(loggerMock, keys, connection);

    await cache.update('mocked-segment', ['a', 'b', 'c'], ['d'], 1);

    expect(await cache.getChangeNumber('mocked-segment') === 1).toBe(true);

    expect(await cache.getChangeNumber('inexistent-segment')).toBe(undefined); // -1 if the segment doesn't exist

    await cache.update('mocked-segment', ['d', 'e'], [], 2);

    await cache.update('mocked-segment', [], ['a', 'c'], 2);

    expect(await cache.getChangeNumber('mocked-segment') === 2).toBe(true);

    expect(await cache.isInSegment('mocked-segment', 'a')).toBe(false);
    expect(await cache.isInSegment('mocked-segment', 'b')).toBe(true);
    expect(await cache.isInSegment('mocked-segment', 'c')).toBe(false);
    expect(await cache.isInSegment('mocked-segment', 'd')).toBe(true);
    expect(await cache.isInSegment('mocked-segment', 'e')).toBe(true);

    // Teardown
    await connection.del(await connection.keys(`${prefix}.segment*`)); // @TODO use `cache.clear` method when implemented
    await connection.disconnect();
  });

});
