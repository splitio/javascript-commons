import { matcherTypes } from '../matcherTypes';
import { matcherFactory } from '..';
import { IMatcher, IMatcherDto } from '../../types';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('MATCHER CONTAINS_ALL_OF_SET / should return true ONLY when value contains all of set ["update", "add"]', function () {
  // @ts-ignore
  let matcher = matcherFactory(loggerMock, {
    negate: false,
    type: matcherTypes.CONTAINS_ALL_OF_SET,
    value: ['update', 'add']
  } as IMatcherDto) as IMatcher;

  expect(matcher(['update', 'add'])).toBe(true); // ["update", "add"] contains all of set ["update", "add"]
  expect(matcher(['update', 'add', 'delete'])).toBe(true); // ["update", "add", "delete"] contains all of set ["update", "add"]
  expect(matcher(['update'])).toBe(false); // ["update"] does not contain all of set ["update", "add"]
  expect(matcher(['add', 'create'])).toBe(false); // ["add", "create"] does not contain all of set ["update", "add"]
  expect(matcher(['add'])).toBe(false); // ["add"] does not contain all of set ["update", "add"]
});
