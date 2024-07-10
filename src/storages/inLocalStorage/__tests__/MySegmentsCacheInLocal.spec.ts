import { MySegmentsCacheInLocal } from '../MySegmentsCacheInLocal';
import { KeyBuilderCS } from '../../KeyBuilderCS';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('SEGMENT CACHE / in LocalStorage', () => {
  const keys = new KeyBuilderCS('SPLITIO', 'user');
  const cache = new MySegmentsCacheInLocal(loggerMock, keys);

  cache.clear();

  cache.addToSegment('mocked-segment');
  cache.addToSegment('mocked-segment-2');

  expect(cache.isInSegment('mocked-segment')).toBe(true);
  expect(cache.getRegisteredSegments()).toEqual(['mocked-segment', 'mocked-segment-2']);
  expect(cache.getKeysCount()).toBe(1);

  cache.removeFromSegment('mocked-segment');

  expect(cache.isInSegment('mocked-segment')).toBe(false);
  expect(cache.getRegisteredSegments()).toEqual(['mocked-segment-2']);
  expect(cache.getKeysCount()).toBe(1);

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

  cache.resetSegments(['segment1']);

  expect(localStorage.getItem(newKey1)).toBe('1'); // The segment key for segment1, as is part of the new list, should be migrated.
  expect(localStorage.getItem(newKey2)).toBe(null); // The segment key for segment2 should not be migrated.
  expect(localStorage.getItem(oldKey1)).toBe(null); // Old keys are removed.
  expect(localStorage.getItem(oldKey2)).toBe(null); // Old keys are removed.

  cache.clear();
});
