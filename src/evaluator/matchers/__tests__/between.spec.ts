import { matcherTypes } from '../matcherTypes';
import matcherFactory from '..';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('MATCHER BETWEEN / should return true ONLY when the value is between 10 and 20', function () {
  // @ts-ignore
  let matcher = matcherFactory(loggerMock, {
    negate: false,
    type: matcherTypes.BETWEEN,
    value: {
      dataType: 'NUMBER',
      start: 10,
      end: 20
    }
  } as IMatcherDto) as IMatcher;

  expect(matcher(9)).toBe(false); // 9 is not between 10 and 20
  expect(matcher(10)).toBe(true); // 10 is between 10 and 20
  expect(matcher(15)).toBe(true); // 15 is between 10 and 20
  expect(matcher(20)).toBe(true); // 20 is between 10 and 20
  expect(matcher(21)).toBe(false); // 21 is not between 10 and 20
  expect(matcher(undefined)).toBe(false); // undefined is not between 10 and 20
  expect(matcher(null)).toBe(false); // null is not between 10 and 20
});
