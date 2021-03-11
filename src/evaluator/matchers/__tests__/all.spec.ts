import { matcherTypes } from '../matcherTypes';
import matcherFactory from '..';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('MATCHER ALL_KEYS / should always return true', function () {
  // @ts-ignore
  let matcher = matcherFactory(loggerMock, {
    type: matcherTypes.ALL_KEYS,
    value: undefined
  } as IMatcherDto) as IMatcher;

  expect(matcher('somekey')).toBe(true); // "somekey" should be true
  expect(matcher('another key')).toBe(true); // "another key" should be true
});
