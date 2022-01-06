import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '..';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('MATCHER CONTAINS_ANY_OF_SET / should return true ONLY when value contains any of set ["update", "add"]', function () {
  // @ts-ignore
  let matcher = matcherFactory(loggerMock, {
    negate: false,
    type: matcherTypes.CONTAINS_ANY_OF_SET,
    value: ['update', 'add']
  } as IMatcherDto) as IMatcher;

  expect(matcher(['update', 'add'])).toBe(true); // ["update", "add"] contains any of set ["update", "add"]
  expect(matcher(['rename', 'add', 'delete'])).toBe(true); // ["rename", "add", "delete"] contains any of set ["update", "add"]
  expect(matcher(['update'])).toBe(true); // ["update"] contains any of set ["update", "add"]
  expect(matcher(['add', 'create'])).toBe(true); // ["add", "create"] contains any of set ["update", "add"]
  expect(matcher(['add'])).toBe(true); // ["add"] contains any of set ["update", "add"]
  expect(matcher(['rename'])).toBe(false); // ["rename"] does not contain any of set ["update", "add"]
  expect(matcher(['rename', 'admin'])).toBe(false); // ["rename", "admin"] does not contain any of set ["update", "add"]
});
