import parser from '..';
import { keyParser } from '../../../utils/key';
import { ISplitCondition } from '../../../dtos/types';
import { IEvaluation } from '../../types';

test('PARSER / if user.boolean is true then split 100%:on', async function () {

  // @ts-ignore
  const evaluator = parser([{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'bool'
        },
        matcherType: 'EQUAL_TO_BOOLEAN',
        negate: false,
        booleanMatcherData: true
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('testing'), 31, 100, 31, {
    bool: false
  }) as IEvaluation;
  expect(evaluation).toBe(undefined);

  evaluation = await evaluator(keyParser('testing'), 31, 100, 31, {
    bool: true
  }) as IEvaluation;
  expect(evaluation.treatment).toBe('on');

  evaluation = await evaluator(keyParser('testing'), 31, 100, 31, {
    bool: 'invalid'
  }) as IEvaluation;
  expect(evaluation).toBe(undefined);

  evaluation = await evaluator(keyParser('testing'), 31, 100, 31, {
    bool: 'True'
  }) as IEvaluation;
  expect(evaluation.treatment).toBe('on');
});
