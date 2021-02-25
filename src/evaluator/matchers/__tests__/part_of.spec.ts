import { matcherTypes } from '../matcherTypes';
import matcherFactory from '..';
import { IMatcher, IMatcherDto } from '../../types';
import { noopLogger } from '../../../logger/noopLogger';

test('MATCHER PART_OF_SET / should return true ONLY when value is part of of set ["update", "add", "delete"]', function () {
  // @ts-ignore
  let matcher = matcherFactory(noopLogger, {
    negate: false,
    type: matcherTypes.PART_OF_SET,
    value: ['update', 'add', 'delete']
  } as IMatcherDto) as IMatcher;

  expect(matcher(['update', 'add'])).toBe(true); // ["update", "add"] is part of of set ["update", "add", "delete"]
  expect(matcher(['add', 'update'])).toBe(true); // ["add", "update"] is part of of set ["update", "add", "delete"]
  expect(matcher(['update', 'add', 'delete'])).toBe(true); // ["update", "add", "delete"] is part of of set ["update", "add", "delete"]
  expect(matcher(['update'])).toBe(true); // ["update"] is part of set ["update", "add", "delete"]
  expect(matcher(['add', 'create'])).toBe(false); // ["add", "create"] is not part of set ["update", "add", "delete"]
  expect(matcher(['write'])).toBe(false); // ["add"] is not part of set ["update", "add", "delete"]
});
