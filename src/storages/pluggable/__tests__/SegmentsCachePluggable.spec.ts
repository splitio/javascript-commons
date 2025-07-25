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

  test('isInSegment, set/getChangeNumber, add/removeFromSegment', async () => {
    const cache = new SegmentsCachePluggable(loggerMock, keyBuilder, wrapperMock);

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
