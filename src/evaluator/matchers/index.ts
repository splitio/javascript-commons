import { allMatcherContext } from './all';
import { segmentMatcherContext } from './segment';
import { whitelistMatcherContext } from './whitelist';
import { equalToMatcherContext } from './eq';
import { greaterThanEqualMatcherContext } from './gte';
import { lessThanEqualMatcherContext } from './lte';
import { betweenMatcherContext } from './between';
import { equalToSetMatcherContext } from './eq_set';
import { containsAnySetMatcherContext } from './cont_any';
import { containsAllSetMatcherContext } from './cont_all';
import { partOfSetMatcherContext } from './part_of';
import { endsWithMatcherContext } from './ew';
import { startsWithMatcherContext } from './sw';
import { containsStringMatcherContext } from './cont_str';
import { dependencyMatcherContext } from './dependency';
import { booleanMatcherContext } from './boolean';
import { stringMatcherContext } from './string';
import { IStorageAsync, IStorageSync } from '../../storages/types';
import { IMatcher, IMatcherDto } from '../types';
import { ILogger } from '../../logger/types';

const matchers = [
  undefined, // UNDEFINED: 0,
  allMatcherContext, // ALL_KEYS: 1,
  segmentMatcherContext, // IN_SEGMENT: 2,
  whitelistMatcherContext, // WHITELIST: 3,
  equalToMatcherContext, // EQUAL_TO: 4,
  greaterThanEqualMatcherContext, // GREATER_THAN_OR_EQUAL_TO: 5,
  lessThanEqualMatcherContext, // LESS_THAN_OR_EQUAL_TO: 6,
  betweenMatcherContext, // BETWEEN: 7,
  equalToSetMatcherContext, // EQUAL_TO_SET: 8,
  containsAnySetMatcherContext, // CONTAINS_ANY_OF_SET: 9,
  containsAllSetMatcherContext, // CONTAINS_ALL_OF_SET: 10,
  partOfSetMatcherContext, // PART_OF_SET: 11,
  endsWithMatcherContext, // ENDS_WITH: 12,
  startsWithMatcherContext, // STARTS_WITH: 13,
  containsStringMatcherContext, // CONTAINS_STRING: 14,
  dependencyMatcherContext, // IN_SPLIT_TREATMENT: 15,
  booleanMatcherContext, // EQUAL_TO_BOOLEAN: 16,
  stringMatcherContext // MATCHES_STRING: 17
];

/**
 * Matcher factory.
 */
export function matcherFactory(log: ILogger, matcherDto: IMatcherDto, storage?: IStorageSync | IStorageAsync): IMatcher | undefined {
  let {
    type,
    value
  } = matcherDto;

  let matcherFn;
  // @ts-ignore
  if (matchers[type]) matcherFn = matchers[type](log, value, storage); // There is no index-out-of-bound exception in JavaScript
  return matcherFn;
}
