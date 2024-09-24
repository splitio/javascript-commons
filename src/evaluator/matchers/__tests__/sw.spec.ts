import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '..';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('MATCHER STARTS_WITH / should return true ONLY when the value starts with ["a", "b", "c"]', function () {
  const matcher = matcherFactory(loggerMock, {
    negate: false,
    type: matcherTypes.STARTS_WITH,
    value: ['a', 'b', 'c']
  } as IMatcherDto) as IMatcher;

  expect(matcher('awesome')).toBe(true); // awesome starts with ["a", "b", "c"]
  expect(matcher('black')).toBe(true); // black starts with ["a", "b", "c"]
  expect(matcher('chello')).toBe(true); // chello starts with ["a", "b", "c"]
  expect(matcher('violin')).toBe(false); // violin doesn't start with ["a", "b", "c"]
  expect(matcher('manager')).toBe(false); // manager doesn't start with ["a", "b", "c"]
});
