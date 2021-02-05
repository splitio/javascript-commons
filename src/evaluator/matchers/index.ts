import allMatcher from './all';
import segmentMatcher from './segment';
import whitelistMatcher from './whitelist';
import eqMatcher from './eq';
import gteMatcher from './gte';
import lteMatcher from './lte';
import betweenMatcher from './between';
import equalToSetMatcher from './eq_set';
import containsAllSetMatcher from './cont_all';
import containsAnySetMatcher from './cont_any';
import partOfSetMatcher from './part_of';
import swMatcher from './sw';
import ewMatcher from './ew';
import containsStrMatcher from './cont_str';
import dependencyMatcher from './dependency';
import booleanMatcher from './boolean';
import stringMatcher from './string';
import { IStorageAsync, IStorageSync } from '../../storages/types';
import { IMatcher, IMatcherDto } from '../types';

const matchers = [
  undefined, // UNDEFINED: 0,
  allMatcher, // ALL_KEYS: 1,
  segmentMatcher, // IN_SEGMENT: 2,
  whitelistMatcher, // WHITELIST: 3,
  eqMatcher, // EQUAL_TO: 4,
  gteMatcher, // GREATER_THAN_OR_EQUAL_TO: 5,
  lteMatcher, // LESS_THAN_OR_EQUAL_TO: 6,
  betweenMatcher, // BETWEEN: 7,
  equalToSetMatcher, // EQUAL_TO_SET: 8,
  containsAnySetMatcher, // CONTAINS_ANY_OF_SET: 9,
  containsAllSetMatcher, // CONTAINS_ALL_OF_SET: 10,
  partOfSetMatcher, // PART_OF_SET: 11,
  ewMatcher, // ENDS_WITH: 12,
  swMatcher, // STARTS_WITH: 13,
  containsStrMatcher, // CONTAINS_STRING: 14,
  dependencyMatcher, // IN_SPLIT_TREATMENT: 15,
  booleanMatcher, // EQUAL_TO_BOOLEAN: 16,
  stringMatcher // MATCHES_STRING: 17
];

/**
 * Matcher factory.
 */
export default function matcherFactory(matcherDto: IMatcherDto, storage?: IStorageSync | IStorageAsync): IMatcher | undefined {
  let {
    type,
    value
  } = matcherDto;

  let matcherFn;
  // @ts-ignore
  if (matchers[type]) matcherFn = matchers[type](value, storage); // There is no index-out-of-bound exception in JavaScript
  return matcherFn;
}
