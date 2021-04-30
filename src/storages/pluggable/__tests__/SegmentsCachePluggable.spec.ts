import { SegmentsCachePluggable } from '../SegmentsCachePluggable';
import KeyBuilder from '../../KeyBuilder';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { wrapperMock } from './wrapper.mock';

const keyBuilder = new KeyBuilder();

describe('SEGMENTS CACHE PLUGGABLE', () => {

  afterEach(() => {
    loggerMock.mockClear();
    wrapperMock.mockClear();
  });

  test('isInSegment, set/getChangeNumber', async () => {
    const cache = new SegmentsCachePluggable(loggerMock, keyBuilder, wrapperMock);

    // assert setChangeNumber and getChangeNumber
    expect(await cache.setChangeNumber('mocked-segment', 100)).toBe(false);
    expect(await cache.getChangeNumber('mocked-segment')).toBe(100);
    expect(await cache.setChangeNumber('mocked-segment', 200)).toBe(true);
    expect(await cache.getChangeNumber('mocked-segment')).toBe(200);
    expect(await cache.getChangeNumber('inexistent-segment')).toBe(-1); // -1 if the segment doesn't exist

    // mock segment keys
    wrapperMock._cache[keyBuilder.buildSegmentNameKey('mocked-segment')] = ['b', 'd'];

    expect(await cache.isInSegment('mocked-segment', 'a')).toBe(false);
    expect(await cache.isInSegment('mocked-segment', 'b')).toBe(true);
    expect(await cache.isInSegment('mocked-segment', 'c')).toBe(false);
    expect(await cache.isInSegment('mocked-segment', 'd')).toBe(true);

    expect(await cache.isInSegment('inexistent-segment', 'a')).toBe(false);
  });

});
