import { ISplit } from '../../dtos/types';
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
  expect(!storage.uniqueKeys || typeof storage.uniqueKeys === 'object').toBeTruthy;
}

export function assertSyncRecorderCacheInterface(cache: IEventsCacheSync | IImpressionsCacheSync) {
  expect(typeof cache.isEmpty).toBe('function');
  expect(typeof cache.clear).toBe('function');
  expect(typeof cache.pop).toBe('function');
  expect(typeof cache.track).toBe('function');
}

// Split mocks

//@ts-ignore
export const splitWithUserTT: ISplit = { name: 'user_ff', trafficTypeName: 'user_tt', conditions: [] };
//@ts-ignore
export const splitWithAccountTT: ISplit = { name: 'account_ff', trafficTypeName: 'account_tt', conditions: [] };
//@ts-ignore
export const splitWithAccountTTAndUsesSegments: ISplit = { trafficTypeName: 'account_tt', conditions: [{ matcherGroup: { matchers: [{ matcherType: 'IN_SEGMENT', userDefinedSegmentMatcherData: { segmentName: 'employees' } }] } }] };
//@ts-ignore
export const something: ISplit = { name: 'something' };
//@ts-ignore
export const somethingElse: ISplit = { name: 'something else' };

// - With flag sets

//@ts-ignore
export const featureFlagWithEmptyFS: ISplit = { name: 'ff_empty', sets: [] };
//@ts-ignore
export const featureFlagOne: ISplit = { name: 'ff_one', sets: ['o','n','e'] };
//@ts-ignore
export const featureFlagTwo: ISplit = { name: 'ff_two', sets: ['t','w','o'] };
//@ts-ignore
export const featureFlagThree: ISplit = { name: 'ff_three', sets: ['t','h','r','e'] };
//@ts-ignore
export const featureFlagWithoutFS: ISplit = { name: 'ff_four' };
