import { IStorageSync, IStorageAsync } from '../types';

// Assert that instances created by storage factories have the expected interface
export function assertStorageInterface(storage: IStorageSync | IStorageAsync) {
  expect(typeof storage.destroy).toBe('function');
  expect(typeof storage.splits).toBe('object');
  expect(typeof storage.segments).toBe('object');
  expect(typeof storage.impressions).toBe('object');
  expect(typeof storage.events).toBe('object');
  expect(!storage.latencies || typeof storage.latencies === 'object').toBeTruthy;
  expect(!storage.counts || typeof storage.counts === 'object').toBeTruthy;
  expect(!storage.impressionCounts || typeof storage.impressionCounts === 'object').toBeTruthy;
}

// Split mocks

export const splitWithUserTT = '{ "trafficTypeName": "user_tt", "conditions": [] }';

export const splitWithAccountTT = '{ "trafficTypeName": "account_tt", "conditions": [] }';

export const splitWithAccountTTAndUsesSegments = '{ "trafficTypeName": "account_tt", "conditions": [{ "matcherGroup": { "matchers": [{ "matcherType": "IN_SEGMENT", "userDefinedSegmentMatcherData": { "segmentName": "employees" } }]}}] }';

export const parsedSplitWithSegments = {
  name: 'Split1',
  status: 'ACTIVE',
  conditions: [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'IN_SEGMENT',
        userDefinedSegmentMatcherData: {
          segmentName: 'A'
        }
      }, {
        matcherType: 'IN_SEGMENT',
        userDefinedSegmentMatcherData: {
          segmentName: 'B'
        }
      }]
    }
  }]
};
