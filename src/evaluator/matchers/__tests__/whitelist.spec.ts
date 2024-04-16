import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '..';
import { _Set } from '../../../utils/lang/sets';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('MATCHER WHITELIST / should return true ONLY when the key is defined', function () {
  const matcher = matcherFactory(loggerMock, {
    type: matcherTypes.WHITELIST,
    value: new _Set(['key'])
  } as IMatcherDto) as IMatcher;

  expect(matcher('key')).toBe(true); // "key" should be true
  expect(matcher('another key')).toBe(false); // "another key" should be false
});
