import { IRBSegment, ISplit } from '../../dtos/types';
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


export const ALWAYS_ON_SPLIT: ISplit = { 'trafficTypeName': 'user', 'name': 'always-on', 'trafficAllocation': 100, 'trafficAllocationSeed': 1012950810, 'seed': -725161385, 'status': 'ACTIVE', 'killed': false, 'defaultTreatment': 'off', 'changeNumber': 1494364996459, 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': null }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': null, 'whitelistMatcherData': null, 'unaryNumericMatcherData': null, 'betweenMatcherData': null }] }, 'partitions': [{ 'treatment': 'on', 'size': 100 }, { 'treatment': 'off', 'size': 0 }], 'label': 'in segment all' }], 'sets': [] };
export const ALWAYS_OFF_SPLIT: ISplit = { 'trafficTypeName': 'user', 'name': 'always-off', 'trafficAllocation': 100, 'trafficAllocationSeed': -331690370, 'seed': 403891040, 'status': 'ACTIVE', 'killed': false, 'defaultTreatment': 'on', 'changeNumber': 1494365020316, 'conditions': [{ 'conditionType': 'ROLLOUT', 'matcherGroup': { 'combiner': 'AND', 'matchers': [{ 'keySelector': { 'trafficType': 'user', 'attribute': null }, 'matcherType': 'ALL_KEYS', 'negate': false, 'userDefinedSegmentMatcherData': null, 'whitelistMatcherData': null, 'unaryNumericMatcherData': null, 'betweenMatcherData': null }] }, 'partitions': [{ 'treatment': 'on', 'size': 0 }, { 'treatment': 'off', 'size': 100 }], 'label': 'in segment all' }], 'sets': [] }; //@ts-ignore
export const splitWithUserTT: ISplit = { name: 'user_ff', trafficTypeName: 'user_tt', conditions: [] }; //@ts-ignore
export const splitWithAccountTT: ISplit = { name: 'account_ff', trafficTypeName: 'account_tt', conditions: [] }; //@ts-ignore
export const splitWithAccountTTAndUsesSegments: ISplit = { trafficTypeName: 'account_tt', conditions: [{ matcherGroup: { matchers: [{ matcherType: 'IN_SEGMENT', userDefinedSegmentMatcherData: { segmentName: 'employees' } }] } }] }; //@ts-ignore
export const something: ISplit = { name: 'something' }; //@ts-ignore
export const somethingElse: ISplit = { name: 'something else' };

// - With flag sets

//@ts-ignore
export const featureFlagWithEmptyFS: ISplit = { name: 'ff_empty', sets: [] };
//@ts-ignore
export const featureFlagOne: ISplit = { name: 'ff_one', sets: ['o', 'n', 'e'] };
//@ts-ignore
export const featureFlagTwo: ISplit = { name: 'ff_two', sets: ['t', 'w', 'o'] };
//@ts-ignore
export const featureFlagThree: ISplit = { name: 'ff_three', sets: ['t', 'h', 'r', 'e'] };
//@ts-ignore
export const featureFlagWithoutFS: ISplit = { name: 'ff_four' };

// Rule-based segments
//@ts-ignore
export const rbSegment: IRBSegment = { name: 'rb_segment', conditions: [{ matcherGroup: { matchers: [{ matcherType: 'EQUAL_TO', unaryNumericMatcherData: { value: 10 } }] } }] };
//@ts-ignore
export const rbSegmentWithInSegmentMatcher: IRBSegment = { name: 'rb_segment_with_in_segment_matcher', conditions: [{ matcherGroup: { matchers: [{ matcherType: 'IN_SEGMENT', userDefinedSegmentMatcherData: { segmentName: 'employees' } }] } }] };
