import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '..';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('MATCHER CONTAINS_STRING / should return true ONLY when the value is contained in ["roni", "bad", "ar"]', () => {
  const matcher = matcherFactory(loggerMock, {
    negate: false,
    type: matcherTypes.CONTAINS_STRING,
    value: ['roni', 'bad', 'ar']
  } as IMatcherDto) as IMatcher;

  expect(matcher('pepperoni')).toBe(true); // pepperoni contain ["roni", "bad", "ar"]
  expect(matcher('badminton')).toBe(true); // badminton contain ["roni", "bad", "ar"]
  expect(matcher('market')).toBe(true); // market contain ["roni", "bad", "ar"]
  expect(matcher('violin')).toBe(false); // violin does not contain ["roni", "bad", "ar"]
  expect(matcher('manager')).toBe(false); // manager does not contain ["roni", "bad", "ar"]
});
