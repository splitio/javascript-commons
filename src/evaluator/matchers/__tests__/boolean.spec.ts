import { matcherTypes } from '../matcherTypes';
import matcherFactory from '..';
import { IMatcher, IMatcherDto } from '../../types';

test('MATCHER BOOLEAN / should return true ONLY when the value is true', function () {
  // @ts-ignore
  const matcher = matcherFactory({
    type: matcherTypes.EQUAL_TO_BOOLEAN,
    value: true
  } as IMatcherDto) as IMatcher;

  expect(matcher(true)).toBe(true);
  expect(matcher(false)).toBe(false);
  expect(matcher('false')).toBe(false);
  expect(matcher('true')).toBe(false);
  expect(matcher(0)).toBe(false);
  expect(matcher(1)).toBe(false);
});
