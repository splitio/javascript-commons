import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '..';
import { evaluateFeature } from '../../index';
import { IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { IRBSegment, ISplit } from '../../../dtos/types';
import { IStorageAsync, IStorageSync } from '../../../storages/types';
import { thenable } from '../../../utils/promise/thenable';
import { ALWAYS_ON_SPLIT } from '../../../storages/__tests__/testUtils';

const STORED_SPLITS: Record<string, ISplit> = {
  'always-on': ALWAYS_ON_SPLIT
};

const STORED_SEGMENTS: Record<string, Set<string>> = {
  'segment_test': new Set(['emi@split.io']),
  'regular_segment': new Set(['nadia@split.io'])
};

const STORED_RBSEGMENTS: Record<string, IRBSegment> = {
  'mauro_rule_based_segment': {
    changeNumber: 5,
    name: 'mauro_rule_based_segment',
    status: 'ACTIVE',
    excluded: {
      keys: ['mauro@split.io', 'gaston@split.io'],
      segments: [
        { type: 'regular', name: 'segment_test' }
      ]
    },
    conditions: [
      {
        matcherGroup: {
          combiner: 'AND',
          matchers: [
            {
              keySelector: {
                trafficType: 'user',
                attribute: 'location',
              },
              matcherType: 'WHITELIST',
              negate: false,
              whitelistMatcherData: {
                whitelist: [
                  'mdp',
                  'tandil',
                  'bsas'
                ]
              }
            },
            {
              keySelector: {
                trafficType: 'user',
                attribute: null
              },
              matcherType: 'ENDS_WITH',
              negate: false,
              whitelistMatcherData: {
                whitelist: [
                  '@split.io'
                ]
              }
            }
          ]
        }
      },
      {
        matcherGroup: {
          combiner: 'AND',
          matchers: [
            {
              keySelector: {
                trafficType: 'user',
                attribute: null
              },
              matcherType: 'IN_SEGMENT',
              negate: false,
              userDefinedSegmentMatcherData: {
                segmentName: 'regular_segment'
              }
            }
          ]
        }
      }
    ]
  },
  'depend_on_always_on': {
    name: 'depend_on_always_on',
    changeNumber: 123,
    status: 'ACTIVE',
    excluded: {
      keys: [],
      segments: []
    },
    conditions: [{
      matcherGroup: {
        combiner: 'AND',
        matchers: [{
          matcherType: 'IN_SPLIT_TREATMENT',
          keySelector: {
            trafficType: 'user',
            attribute: null
          },
          negate: false,
          dependencyMatcherData: {
            split: 'always-on',
            treatments: [
              'on',
            ]
          }
        }]
      }
    }]
  },
  'depend_on_mauro_rule_based_segment': {
    name: 'depend_on_mauro_rule_based_segment',
    changeNumber: 123,
    status: 'ACTIVE',
    excluded: {
      keys: [],
      segments: []
    },
    conditions: [{
      matcherGroup: {
        combiner: 'AND',
        matchers: [{
          matcherType: 'IN_RULE_BASED_SEGMENT',
          keySelector: {
            trafficType: 'user',
            attribute: null
          },
          negate: false,
          userDefinedSegmentMatcherData: {
            segmentName: 'mauro_rule_based_segment'
          }
        }]
      }
    }]
  },
};

const mockStorageSync = {
  isSync: true,
  splits: {
    getSplit(name: string) {
      return STORED_SPLITS[name];
    }
  },
  segments: {
    isInSegment(segmentName: string, matchingKey: string) {
      return STORED_SEGMENTS[segmentName] ? STORED_SEGMENTS[segmentName].has(matchingKey) : false;
    }
  },
  rbSegments: {
    get(rbsegmentName: string) {
      return STORED_RBSEGMENTS[rbsegmentName];
    }
  }
} as unknown as IStorageSync;

const mockStorageAsync = {
  isSync: false,
  splits: {
    getSplit(name: string) {
      return Promise.resolve(STORED_SPLITS[name]);
    }
  },
  segments: {
    isInSegment(segmentName: string, matchingKey: string) {
      return Promise.resolve(STORED_SEGMENTS[segmentName] ? STORED_SEGMENTS[segmentName].has(matchingKey) : false);
    }
  },
  rbSegments: {
    get(rbsegmentName: string) {
      return Promise.resolve(STORED_RBSEGMENTS[rbsegmentName]);
    }
  }
} as unknown as IStorageAsync;

describe.each([
  { mockStorage: mockStorageSync, isAsync: false },
  { mockStorage: mockStorageAsync, isAsync: true }
])('MATCHER IN_RULE_BASED_SEGMENT', ({ mockStorage, isAsync }) => {
  test('should support excluded keys, excluded segments, and multiple conditions', async () => {
    const matcher = matcherFactory(loggerMock, {
      type: matcherTypes.IN_RULE_BASED_SEGMENT,
      value: 'mauro_rule_based_segment'
    } as IMatcherDto, mockStorage)!;

    const dependentMatcher = matcherFactory(loggerMock, {
      type: matcherTypes.IN_RULE_BASED_SEGMENT,
      value: 'depend_on_mauro_rule_based_segment'
    } as IMatcherDto, mockStorage)!;

    [matcher, dependentMatcher].forEach(async matcher => {

      // should return false if the provided key is excluded (even if some condition is met)
      let match = matcher({ key: 'mauro@split.io', attributes: { location: 'mdp' } }, evaluateFeature);
      expect(thenable(match)).toBe(isAsync);
      expect(await match).toBe(false);

      // should return false if the provided key is in some excluded segment (even if some condition is met)
      match = matcher({ key: 'emi@split.io', attributes: { location: 'tandil' } }, evaluateFeature);
      expect(thenable(match)).toBe(isAsync);
      expect(await match).toBe(false);

      // should return false if doesn't match any condition
      match = matcher({ key: 'zeta@split.io' }, evaluateFeature);
      expect(thenable(match)).toBe(isAsync);
      expect(await match).toBe(false);
      match = matcher({ key: { matchingKey: 'zeta@split.io', bucketingKey: '123' }, attributes: { location: 'italy' } }, evaluateFeature);
      expect(thenable(match)).toBe(isAsync);
      expect(await match).toBe(false);

      // should return true if match the first condition: location attribute in whitelist and key ends with '@split.io'
      match = matcher({ key: 'emma@split.io', attributes: { location: 'tandil' } }, evaluateFeature);
      expect(thenable(match)).toBe(isAsync);
      expect(await match).toBe(true);

      // should return true if match the second condition: key in regular_segment
      match = matcher({ key: { matchingKey: 'nadia@split.io', bucketingKey: '123' }, attributes: { location: 'mdp' } }, evaluateFeature);
      expect(thenable(match)).toBe(isAsync);
      expect(await match).toBe(true);
    });
  });

  test('edge cases', async () => {
    const matcherNotExist = matcherFactory(loggerMock, {
      type: matcherTypes.IN_RULE_BASED_SEGMENT,
      value: 'non_existent_segment'
    } as IMatcherDto, mockStorageSync)!;

    // should return false if the provided segment does not exist
    expect(await matcherNotExist({ key: 'a-key' }, evaluateFeature)).toBe(false);

    const matcherTrueAlwaysOn = matcherFactory(loggerMock, {
      type: matcherTypes.IN_RULE_BASED_SEGMENT,
      value: 'depend_on_always_on'
    } as IMatcherDto, mockStorageSync)!;

    // should support feature flag dependency matcher
    expect(await matcherTrueAlwaysOn({ key: 'a-key' }, evaluateFeature)).toBe(true); // Parent split returns one of the expected treatments, so the matcher returns true
  });

});
