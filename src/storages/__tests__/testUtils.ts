import { IStorageSync, IStorageAsync, IImpressionsCacheSync, IEventsCacheSync } from '../types';

// Assert that instances created by storage factories have the expected interface
export function assertStorageInterface(storage: IStorageSync | IStorageAsync) {
  expect(typeof storage.destroy).toBe('function');
  expect(typeof storage.splits).toBe('object');
  expect(typeof storage.segments).toBe('object');
  expect(typeof storage.impressions).toBe('object');
  expect(typeof storage.events).toBe('object');
  expect(!storage.telemetry || typeof storage.telemetry === 'object').toBeTruthy;
  expect(!storage.impressionCounts || typeof storage.impressionCounts === 'object').toBeTruthy;
}

export function assertSyncRecorderCacheInterface(cache: IEventsCacheSync | IImpressionsCacheSync) {
  expect(typeof cache.isEmpty).toBe('function');
  expect(typeof cache.clear).toBe('function');
  expect(typeof cache.pop).toBe('function');
  expect(typeof cache.track).toBe('function');
}

// Split mocks

export const splitWithUserTT = '{ "trafficTypeName": "user_tt", "conditions": [] }';

export const splitWithAccountTT = '{ "trafficTypeName": "account_tt", "conditions": [] }';

export const splitWithAccountTTAndUsesSegments = '{ "trafficTypeName": "account_tt", "conditions": [{ "matcherGroup": { "matchers": [{ "matcherType": "IN_SEGMENT", "userDefinedSegmentMatcherData": { "segmentName": "employees" } }]}}] }';
