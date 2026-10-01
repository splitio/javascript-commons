import { RBSegmentsCacheInRedis } from '../inRedis/RBSegmentsCacheInRedis';
import { RBSegmentsCachePluggable } from '../pluggable/RBSegmentsCachePluggable';
import { KeyBuilderSS } from '../KeyBuilderSS';
import { rbSegment, rbSegmentWithInSegmentMatcher } from '../__tests__/testUtils';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';
import { metadata } from './KeyBuilder.spec';
import { RedisAdapter } from '../inRedis/RedisAdapter';
import { wrapperMockFactory } from '../pluggable/__tests__/wrapper.mock';

const keys = new KeyBuilderSS('RBSEGMENT', metadata);

const redisClient = new RedisAdapter(loggerMock);
const cacheInRedis = new RBSegmentsCacheInRedis(loggerMock, keys, redisClient);

const storageWrapper = wrapperMockFactory();
const cachePluggable = new RBSegmentsCachePluggable(loggerMock, keys, storageWrapper);

describe.each([{ cache: cacheInRedis, wrapper: redisClient }, { cache: cachePluggable, wrapper: storageWrapper }])('Rule-based segments cache async (Redis & Pluggable)', ({ cache, wrapper }) => {

  afterAll(async () => {
    await wrapper.del(keys.buildRBSegmentsTillKey());
    await wrapper.disconnect();
  });

  test('update should ignore outdated rule-based segments', async () => {
    const current = { ...rbSegment, changeNumber: 10 };
    await cache.update([current], [], 10);
    expect(await cache.update([current], [], 10)).toEqual([]);
    expect(await cache.update([{ ...rbSegment, changeNumber: 9 }], [], 10)).toEqual([]);
    expect(await cache.get(rbSegment.name)).toEqual(current);
    expect(await cache.update([{ ...rbSegment, changeNumber: 11 }], [], 11)).toEqual([rbSegment.name]);
  });

  test('update should add and remove segments correctly', async () => {
    // Add segments
    expect(await cache.update([rbSegment, rbSegmentWithInSegmentMatcher], [], 1)).toEqual([rbSegment.name, rbSegmentWithInSegmentMatcher.name]);
    expect(await cache.get(rbSegment.name)).toEqual(rbSegment);
    expect(await cache.get(rbSegmentWithInSegmentMatcher.name)).toEqual(rbSegmentWithInSegmentMatcher);
    expect(await cache.getChangeNumber()).toBe(1);

    // Remove a segment
    expect(await cache.update([], [rbSegment.name], 2)).toEqual([rbSegment.name]);
    expect(await cache.get(rbSegment.name)).toBeNull();
    expect(await cache.get(rbSegmentWithInSegmentMatcher.name)).toEqual(rbSegmentWithInSegmentMatcher);
    expect(await cache.getChangeNumber()).toBe(2);

    // Remove remaining segment
    expect(await cache.update([], [rbSegmentWithInSegmentMatcher.name], 3)).toEqual([rbSegmentWithInSegmentMatcher.name]);
    expect(await cache.get(rbSegment.name)).toBeNull();
    expect(await cache.get(rbSegmentWithInSegmentMatcher.name)).toBeNull();
    expect(await cache.getChangeNumber()).toBe(3);

    // No changes
    expect(await cache.update([], [rbSegmentWithInSegmentMatcher.name], 4)).toEqual([]);
    expect(await cache.getChangeNumber()).toBe(4);
  });

  test('contains should check for segment existence correctly', async () => {
    await cache.update([rbSegment, rbSegmentWithInSegmentMatcher], [], 1);

    expect(await cache.contains(new Set())).toBe(true);
    expect(await cache.contains(new Set([rbSegment.name]))).toBe(true);
    expect(await cache.contains(new Set([rbSegment.name, rbSegmentWithInSegmentMatcher.name]))).toBe(true);
    expect(await cache.contains(new Set(['nonexistent']))).toBe(false);
    expect(await cache.contains(new Set([rbSegment.name, 'nonexistent']))).toBe(false);

    await cache.update([], [rbSegment.name, rbSegmentWithInSegmentMatcher.name], 2);
  });
});
