import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '..';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('MATCHER EQUAL_TO_SET / should return true ONLY when value is equal to set ["update", "add"]', function () {
  // @ts-ignore
  let matcher = matcherFactory(loggerMock, {
    negate: false,
    type: matcherTypes.EQUAL_TO_SET,
    value: ['update', 'add']
  } as IMatcherDto) as IMatcher;

  expect(matcher(['update', 'add'])).toBe(true); // ["update", "add"] is equal to set ["update", "add"]
  expect(matcher(['add', 'update'])).toBe(true); // ["add", "update"] is equal to set ["update", "add"]
  expect(matcher(['rename', 'update', 'add'])).toBe(false); // ["rename", "update", "add"] is not equal to set ["update", "add"]
  expect(matcher(['update'])).toBe(false); // ["update"] is not equal to set ["update", "add"]
  expect(matcher(['write'])).toBe(false); // ["write"] does not equal to set ["update", "add"]
});
