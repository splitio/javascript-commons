import { MySegmentsCacheInLocal } from '../MySegmentsCacheInLocal';
import { KeyBuilderCS, myLargeSegmentsKeyBuilder } from '../../KeyBuilderCS';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('SEGMENT CACHE / in LocalStorage', () => {
  const caches = [
    new MySegmentsCacheInLocal(loggerMock, new KeyBuilderCS('SPLITIO', 'user')),
    new MySegmentsCacheInLocal(loggerMock, myLargeSegmentsKeyBuilder('SPLITIO', 'user'))
  ];

  caches.forEach(cache => {
    cache.clear();

    expect(cache.resetSegments({ k: [{ n: 'mocked-segment' }, { n: 'mocked-segment-2' }], cn: 123 })).toBe(true);
    expect(cache.getChangeNumber()).toBe(123);
    expect(cache.resetSegments({ k: [{ n: 'mocked-segment' }, { n: 'mocked-segment-2' }] })).toBe(false);
    expect(cache.getChangeNumber()).toBe(-1);

    expect(cache.isInSegment('mocked-segment')).toBe(true);
    expect(cache.getRegisteredSegments()).toEqual(['mocked-segment', 'mocked-segment-2']);
    expect(cache.getKeysCount()).toBe(1);
  });

  caches.forEach(cache => {
    // @ts-expect-error
    cache.resetSegments({
      added: [],
      removed: ['mocked-segment']
    });

    expect(cache.isInSegment('mocked-segment')).toBe(false);
    expect(cache.getRegisteredSegments()).toEqual(['mocked-segment-2']);
    expect(cache.getKeysCount()).toBe(1);
  });

  expect(localStorage.getItem('SPLITIO.user.segment.mocked-segment-2')).toBe('1');
  expect(localStorage.getItem('SPLITIO.user.segment.mocked-segment')).toBe(null);
  expect(localStorage.getItem('SPLITIO.user.largeSegment.mocked-segment-2')).toBe('1');
  expect(localStorage.getItem('SPLITIO.user.largeSegment.mocked-segment')).toBe(null);
});
