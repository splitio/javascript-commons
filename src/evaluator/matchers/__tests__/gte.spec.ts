import { matcherTypes } from '../matcherTypes';
import matcherFactory from '..';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('MATCHER GREATER THAN OR EQUAL / should return true ONLY when the value is greater than or equal to 10', function () {
  // @ts-ignore
  let matcher = matcherFactory(loggerMock, {
    negate: false,
    type: matcherTypes.GREATER_THAN_OR_EQUAL_TO,
    value: 10
  } as IMatcherDto) as IMatcher;

  expect(matcher(10)).toBe(true); // 10 >= 10
  expect(matcher(11)).toBe(true); // 11 >= 10
  expect(matcher(9)).toBe(false); // 9 < 10 should not match
});
