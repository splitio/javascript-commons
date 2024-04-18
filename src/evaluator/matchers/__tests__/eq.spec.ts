import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '..';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('MATCHER EQUAL / should return true ONLY when the value is equal to 10', function () {
  const matcher = matcherFactory(loggerMock, {
    negate: false,
    type: matcherTypes.EQUAL_TO,
    value: 10
  } as IMatcherDto) as IMatcher;

  expect(matcher(10)).toBe(true); // 10 == 10
  expect(matcher(11)).toBe(false); // 10 != 11
  expect(matcher(9)).toBe(false); // 10 != 9
});
