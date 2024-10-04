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
    cache.removeFromSegment('mocked-segment');

    expect(cache.isInSegment('mocked-segment')).toBe(false);
    expect(cache.getRegisteredSegments()).toEqual(['mocked-segment-2']);
    expect(cache.getKeysCount()).toBe(1);
  });

  expect(localStorage.getItem('SPLITIO.user.segment.mocked-segment-2')).toBe('1');
  expect(localStorage.getItem('SPLITIO.user.segment.mocked-segment')).toBe(null);
  expect(localStorage.getItem('SPLITIO.user.largeSegment.mocked-segment-2')).toBe('1');
  expect(localStorage.getItem('SPLITIO.user.largeSegment.mocked-segment')).toBe(null);
});

// @BREAKING: REMOVE when removing this backwards compatibility.
test('SEGMENT CACHE / in LocalStorage migration for mysegments keys', () => {

  const keys = new KeyBuilderCS('LS_BC_test.SPLITIO', 'test_nico');
  const cache = new MySegmentsCacheInLocal(loggerMock, keys);

  const oldKey1 = 'test_nico.LS_BC_test.SPLITIO.segment.segment1';
  const oldKey2 = 'test_nico.LS_BC_test.SPLITIO.segment.segment2';
  const newKey1 = keys.buildSegmentNameKey('segment1');
  const newKey2 = keys.buildSegmentNameKey('segment2');

  cache.clear(); // cleanup before starting.

  // Not adding a full suite for LS keys now, testing here
  expect(oldKey1).toBe(`test_nico.${keys.prefix}.segment.segment1`);
  expect('segment1').toBe(keys.extractOldSegmentKey(oldKey1));

  // add two segments, one we don't want to send on reset, should only be cleared, other one will be migrated.
  localStorage.setItem(oldKey1, '1');
  localStorage.setItem(oldKey2, '1');
  expect(localStorage.getItem(newKey1)).toBe(null); // control assertion

  cache.resetSegments({ k: [{ n: 'segment1' }] });

  expect(localStorage.getItem(newKey1)).toBe('1'); // The segment key for segment1, as is part of the new list, should be migrated.
  expect(localStorage.getItem(newKey2)).toBe(null); // The segment key for segment2 should not be migrated.
  expect(localStorage.getItem(oldKey1)).toBe(null); // Old keys are removed.
  expect(localStorage.getItem(oldKey2)).toBe(null); // Old keys are removed.

  cache.clear();
  expect(cache.getRegisteredSegments()).toEqual([]);
  expect(cache.getChangeNumber()).toBe(-1);
});
