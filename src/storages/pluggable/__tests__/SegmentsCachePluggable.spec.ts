import { SegmentsCachePluggable } from '../SegmentsCachePluggable';
import { KeyBuilderSS } from '../../KeyBuilderSS';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { wrapperMock } from './wrapper.mock';
import { metadata } from '../../__tests__/KeyBuilder.spec';

const keyBuilder = new KeyBuilderSS('prefix', metadata);

describe('SEGMENTS CACHE PLUGGABLE', () => {

  afterEach(() => {
    loggerMock.mockClear();
    wrapperMock.mockClear();
  });

  test('isInSegment, getChangeNumber, update', async () => {
    const cache = new SegmentsCachePluggable(loggerMock, keyBuilder, wrapperMock);

    await cache.update('mocked-segment', ['a', 'b', 'c'], ['d'], 1);

    expect(await cache.getChangeNumber('mocked-segment') === 1).toBe(true);

    expect(await cache.getChangeNumber('inexistent-segment')).toBe(-1); // -1 if the segment doesn't exist

    await cache.update('mocked-segment', ['d', 'e'], [], 2);

    await cache.update('mocked-segment', [], ['a', 'c'], 2);

    expect(await cache.getChangeNumber('mocked-segment') === 2).toBe(true);

    expect(await cache.isInSegment('mocked-segment', 'a')).toBe(false);
    expect(await cache.isInSegment('mocked-segment', 'b')).toBe(true);
    expect(await cache.isInSegment('mocked-segment', 'c')).toBe(false);
    expect(await cache.isInSegment('mocked-segment', 'd')).toBe(true);
    expect(await cache.isInSegment('mocked-segment', 'e')).toBe(true);

    expect(await cache.isInSegment('inexistent-segment', 'a')).toBe(false);
  });

  test('registerSegment / getRegisteredSegments', async () => {
    const cache = new SegmentsCachePluggable(loggerMock, keyBuilder, wrapperMock);

    await cache.registerSegments(['s1']);
    await cache.registerSegments(['s2']);
    await cache.registerSegments(['s2', 's3', 's4']);

    const segments = await cache.getRegisteredSegments();

    ['s1', 's2', 's3', 's4'].forEach(s => expect(segments.indexOf(s) !== -1).toBe(true));
  });

});
