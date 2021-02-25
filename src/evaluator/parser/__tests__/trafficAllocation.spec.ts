// @ts-nocheck
import parser from '..';
import { keyParser } from '../../../utils/key';
import { ISplitCondition } from '../../../dtos/types';
import { IEvaluation } from '../../types';
import { noopLogger } from '../../../logger/noopLogger';

test('PARSER / if user is in segment all 100%:on but trafficAllocation is 0%', async function () {

  const evaluator = parser(noopLogger, [{
    conditionType: 'ROLLOUT',
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'ALL_KEYS',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: 'in segment all'
  }] as ISplitCondition[]);

  // @ts-ignore
  const evaluation = await evaluator(keyParser('a key'), 31, 0, 31) as IEvaluation;

  expect(evaluation.treatment).toBe(undefined); // treatment should be undefined
  expect(evaluation.label).toBe('not in split'); // label should be fixed string
});

test('PARSER / if user is in segment all 100%:on but trafficAllocation is 99% with bucket below 99', async function () {

  const evaluator = parser(noopLogger, [{
    conditionType: 'ROLLOUT',
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'ALL_KEYS',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: 'in segment all'
  }] as ISplitCondition[]);

  // @ts-ignore
  const evaluation = await evaluator(keyParser('a key'), 31, 99, 31) as IEvaluation;

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe('in segment all'); // in segment all
});

test('PARSER / if user is in segment all 100%:on but trafficAllocation is 99% and bucket returns 100', async function () {

  const evaluator = parser(noopLogger, [{
    conditionType: 'ROLLOUT',
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'ALL_KEYS',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: 'in segment all'
  }] as ISplitCondition[]);

  // @ts-ignore
  const evaluation = await evaluator(keyParser('a48'), 31, 99, 14) as IEvaluation; // murmur3.bucket('a48', 14) === 100

  expect(evaluation.treatment).toBe(undefined); // treatment should be undefined
  expect(evaluation.label).toBe('not in split'); // label should be fixed string
});

test('PARSER / if user is whitelisted and in segment all 100%:off with trafficAllocation as 0%', async function () {

  const evaluator = parser(noopLogger, [{
    conditionType: 'WHITELIST',
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'WHITELIST',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: {
          whitelist: [
            'a key'
          ]
        }
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }],
    label: 'whitelisted'
  }, {
    conditionType: 'ROLLOUT',
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'ALL_KEYS',
        negate: false,
        userDefinedSegmentMatcherData: null,
        whitelistMatcherData: null
      }]
    },
    partitions: [{
      treatment: 'off',
      size: 100
    }],
    label: 'in segment all'
  }] as ISplitCondition[]);

  // @ts-ignore
  const evaluation = await evaluator(keyParser('a key'), 31, 0, 31) as IEvaluation;

  expect(evaluation.treatment).toBe('on'); // on
  expect(evaluation.label).toBe('whitelisted'); // whitelisted
});
