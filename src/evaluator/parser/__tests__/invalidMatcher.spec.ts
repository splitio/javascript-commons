// @ts-nocheck
import { parser } from '..';
import { ISplitCondition } from '../../../dtos/types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('PARSER / handle invalid matcher as control', async () => {
  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'UNKNOWN_MATCHER',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'A',
      size: 20
    }, {
      treatment: 'B',
      size: 20
    }, {
      treatment: 'A',
      size: 60
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator('aaaaa', 31);

  expect(evaluation.treatment).toBe('control'); // return control when invalid matcher
  expect(evaluation.label).toBe('targeting rule type unsupported by sdk'); // track invalid as targeting rule type unsupported by sdk
});

test('PARSER / handle invalid matcher as control (complex example)', async () => {
  const evaluator = parser(loggerMock, [
    {
      'conditionType': 'WHITELIST',
      'matcherGroup': {
        'combiner': 'AND',
        'matchers': [
          {
            'keySelector': null,
            'matcherType': 'WHITELIST',
            'negate': false,
            'userDefinedSegmentMatcherData': null,
            'whitelistMatcherData': {
              'whitelist': [
                'NicoIncluded'
              ]
            },
            'unaryNumericMatcherData': null,
            'betweenMatcherData': null
          }
        ]
      },
      'partitions': [
        {
          'treatment': 'on',
          'size': 100
        }
      ],
      'label': 'whitelisted'
    },
    {
      'conditionType': 'WHITELIST',
      'matcherGroup': {
        'combiner': 'AND',
        'matchers': [
          {
            'keySelector': null,
            'matcherType': 'WHITELIST',
            'negate': false,
            'userDefinedSegmentMatcherData': null,
            'whitelistMatcherData': {
              'whitelist': [
                'NicoExcluded'
              ]
            },
            'unaryNumericMatcherData': null,
            'betweenMatcherData': null
          }
        ]
      },
      'partitions': [
        {
          'treatment': 'off',
          'size': 100
        }
      ],
      'label': 'whitelisted'
    },
    {
      'conditionType': 'ROLLOUT',
      'matcherGroup': {
        'combiner': 'AND',
        'matchers': [
          {
            'keySelector': {
              'trafficType': 'test',
              'attribute': 'custom'
            },
            'matcherType': 'SARASA',
            'negate': false,
            'userDefinedSegmentMatcherData': null,
            'unaryNumericMatcherData': null,
            'betweenMatcherData': null
          }
        ]
      },
      'partitions': [
        {
          'treatment': 'on',
          'size': 100
        },
        {
          'treatment': 'off',
          'size': 0
        }
      ],
      'label': 'custom in list [test, more test]'
    }
  ]);

  let ev1 = await evaluator('NicoIncluded', 31);
  let ev2 = await evaluator('NicoExcluded', 31);
  let ev3 = await evaluator('another_key', 31);

  for (let ev of [ev1, ev2, ev3]) {
    expect(ev.treatment).toBe('control'); // return control when invalid matcher
    expect(ev.label).toBe('targeting rule type unsupported by sdk'); // track invalid as targeting rule type unsupported by sdk
  }
});

test('PARSER / handle invalid matcher as control (complex example mixing invalid and valid matchers)', async () => {
  const evaluator = parser(loggerMock, [
    {
      'conditionType': 'WHITELIST',
      'matcherGroup': {
        'combiner': 'AND',
        'matchers': [
          {
            'keySelector': null,
            'matcherType': 'WHITELIST',
            'negate': false,
            'userDefinedSegmentMatcherData': null,
            'whitelistMatcherData': {
              'whitelist': [
                'NicoIncluded'
              ]
            },
            'unaryNumericMatcherData': null,
            'betweenMatcherData': null
          }
        ]
      },
      'partitions': [
        {
          'treatment': 'on',
          'size': 100
        }
      ],
      'label': 'whitelisted'
    },
    {
      'conditionType': 'WHITELIST',
      'matcherGroup': {
        'combiner': 'AND',
        'matchers': [
          {
            'keySelector': null,
            'matcherType': 'WHITELIST',
            'negate': false,
            'userDefinedSegmentMatcherData': null,
            'whitelistMatcherData': {
              'whitelist': [
                'NicoExcluded'
              ]
            },
            'unaryNumericMatcherData': null,
            'betweenMatcherData': null
          }
        ]
      },
      'partitions': [
        {
          'treatment': 'off',
          'size': 100
        }
      ],
      'label': 'whitelisted'
    },
    {
      'conditionType': 'ROLLOUT',
      'matcherGroup': {
        'combiner': 'AND',
        'matchers': [
          {
            keySelector: {
              trafficType: 'user',
              attribute: 'account'
            },
            matcherType: 'ALL_KEYS',
            negate: false,
            userDefinedSegmentMatcherData: null,
            whitelistMatcherData: null,
            unaryNumericMatcherData: null,
            betweenMatcherData: null,
            unaryStringMatcherData: null
          },
          {
            'keySelector': {
              'trafficType': 'test',
              'attribute': 'custom'
            },
            'matcherType': 'SARASA',
            'negate': false,
            'userDefinedSegmentMatcherData': null,
            'unaryNumericMatcherData': null,
            'betweenMatcherData': null
          },
          {
            keySelector: {
              trafficType: 'user',
              attribute: 'account'
            },
            matcherType: 'ALL_KEYS',
            negate: false,
            userDefinedSegmentMatcherData: null,
            whitelistMatcherData: null,
            unaryNumericMatcherData: null,
            betweenMatcherData: null,
            unaryStringMatcherData: null
          }
        ]
      },
      'partitions': [
        {
          'treatment': 'on',
          'size': 100
        },
        {
          'treatment': 'off',
          'size': 0
        }
      ],
      'label': 'custom in list [test, more test]'
    }
  ]);

  let ev1 = await evaluator('NicoIncluded', 31);
  let ev2 = await evaluator('NicoExcluded', 31);
  let ev3 = await evaluator('another_key', 31);

  for (let ev of [ev1, ev2, ev3]) {
    expect(ev.treatment).toBe('control'); // return control when invalid matcher
    expect(ev.label).toBe('targeting rule type unsupported by sdk'); // track invalid as targeting rule type unsupported by sdk
  }
});
