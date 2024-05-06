import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '..';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('MATCHER ENDS_WITH / should return true ONLY when the value ends with ["a", "b", "c"]', function () {
  const matcher = matcherFactory(loggerMock, {
    negate: false,
    type: matcherTypes.ENDS_WITH,
    value: ['a', 'b', 'c']
  } as IMatcherDto) as IMatcher;

  expect(matcher('america')).toBe(true); // america ends with ["a", "b", "c"]
  expect(matcher('blob')).toBe(true); // blob ends with ["a", "b", "c"]
  expect(matcher('zodiac')).toBe(true); // zodiac ends with ["a", "b", "c"]
  expect(matcher('violin')).toBe(false); // violin doesn't end with ["a", "b", "c"]
  expect(matcher('manager')).toBe(false); // manager doesn't end with ["a", "b", "c"]
});

test('MATCHER ENDS_WITH / should return true ONLY when the value ends with ["demo.test.org"]', function () {
  const matcher = matcherFactory(loggerMock, {
    negate: false,
    type: matcherTypes.ENDS_WITH,
    value: ['demo.test.org']
  } as IMatcherDto) as IMatcher;

  expect(matcher('robert@demo.test.org')).toBe(true); // robert@demo.test.org should match.
  expect(matcher('robert@test.org')).toBe(false); // robert@test.org should not match.
});
