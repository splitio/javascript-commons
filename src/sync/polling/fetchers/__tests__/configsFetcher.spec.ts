import { IDefinitionChangesResponse } from '../../../../dtos/types';
import { convertConfigsResponseToDefinitionChangesResponse, IConfigsResponse } from '../configsFetcher';

const INPUT: IConfigsResponse = {
  since: 100,
  till: 200,
  updated: [{
    name: 'SomeConfig1',
    variants: [{ name: 'v1', definition: { prop1: true, prop2: 123 } }, { name: 'v2', definition: { prop1: false, prop2: 456 } }],
    changeNumber: 0,
    targeting: { default: 'v2', conditions: [{ partitions: [{ variant: 'v1', size: 100 }], label: 'main condition', matchers: [{ type: 'IS_EQUAL_TO', data: { type: 'NUMBER', number: 42 }, attribute: 'age' }, { type: 'WHITELIST', data: { strings: ['a', 'b', 'c'] }, attribute: 'favoriteCharacter' }] }] }
  }],
};

const EXPECTED_OUTPUT: IDefinitionChangesResponse = {
  ff: {
    s: 100,
    t: 200,
    d: [{
      name: 'SomeConfig1',
      changeNumber: 0,
      status: 'ACTIVE',
      killed: false,
      defaultTreatment: 'v2',
      trafficTypeName: 'user',
      seed: 0,
      configurations: {
        'v1': { 'prop1': true, 'prop2': 123 },
        'v2': { 'prop1': false, 'prop2': 456 },
      },
      conditions: [
        {
          conditionType: 'WHITELIST',
          label: 'main condition',
          matcherGroup: {
            combiner: 'AND',
            matchers: [
              {
                matcherType: 'EQUAL_TO',
                negate: false,
                keySelector: { trafficType: 'user', attribute: 'age' },
                unaryNumericMatcherData: { dataType: 'NUMBER', value: 42 },
              },
              {
                matcherType: 'WHITELIST',
                negate: false,
                keySelector: { trafficType: 'user', attribute: 'favoriteCharacter' },
                whitelistMatcherData: { whitelist: ['a', 'b', 'c'] },
              },
            ],
          },
          partitions: [{ treatment: 'v1', size: 100 }],
        },
        {
          conditionType: 'ROLLOUT',
          matcherGroup: {
            combiner: 'AND',
            matchers: [{
              keySelector: null,
              matcherType: 'ALL_KEYS',
              negate: false,
            }],
          },
          partitions: [{ treatment: 'v2', size: 100 }],
          label: 'default rule',
        },
      ],
    }],
  },
};

describe('convertConfigsResponseToDefinitionChangesResponse', () => {

  test('should convert a configs response to a definition changes response', () => {
    const result = convertConfigsResponseToDefinitionChangesResponse(INPUT);
    expect(result).toEqual(EXPECTED_OUTPUT);
  });

});
