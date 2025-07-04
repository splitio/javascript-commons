import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '..';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('MATCHER WHITELIST / should return true ONLY when the value is in the list', () => {
  const matcher = matcherFactory(loggerMock, {
    type: matcherTypes.WHITELIST,
    value: ['key']
  } as IMatcherDto) as IMatcher;

  expect(matcher('key')).toBe(true); // "key" should be true
  expect(matcher('another key')).toBe(false); // "another key" should be false
});
