import { parser } from '..';
import { keyParser } from '../../../utils/key';
import { ISplitCondition } from '../../../dtos/types';
import { IEvaluation } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('PARSER / if user.string is true then split 100%:on', async function () {
  // @ts-ignore
  const evaluator = parser(loggerMock, [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        keySelector: {
          trafficType: 'user',
          attribute: 'string'
        },
        matcherType: 'MATCHES_STRING',
        negate: false,
        stringMatcherData: '^hello'
      }]
    },
    partitions: [{
      treatment: 'on',
      size: 100
    }]
  }] as ISplitCondition[]);

  let evaluation = await evaluator(keyParser('testing'), 31, 100, 31, {
    string: 'ehllo dude'
  });
  expect(evaluation).toBe(undefined);

  evaluation = await evaluator(keyParser('testing'), 31, 100, 31, {
    string: 'hello dude'
  }) as IEvaluation;
  expect(evaluation.treatment).toBe('on');
});
