export const matcherTypes: Record<string, number> = {
  UNDEFINED: 0, // Value for unsupported or invalid matchers
  ALL_KEYS: 1,
  IN_SEGMENT: 2,
  WHITELIST: 3,
  EQUAL_TO: 4,
  GREATER_THAN_OR_EQUAL_TO: 5,
  LESS_THAN_OR_EQUAL_TO: 6,
  BETWEEN: 7,
  EQUAL_TO_SET: 8,
  CONTAINS_ANY_OF_SET: 9,
  CONTAINS_ALL_OF_SET: 10,
  PART_OF_SET: 11,
  ENDS_WITH: 12,
  STARTS_WITH: 13,
  CONTAINS_STRING: 14,
  IN_SPLIT_TREATMENT: 15,
  EQUAL_TO_BOOLEAN: 16,
  MATCHES_STRING: 17,
  EQUAL_TO_SEMVER: 18,
  GREATER_THAN_OR_EQUAL_TO_SEMVER: 19,
  LESS_THAN_OR_EQUAL_TO_SEMVER: 20,
  BETWEEN_SEMVER: 21,
  IN_LIST_SEMVER: 22,
};

export const matcherDataTypes = {
  BOOLEAN: 'BOOLEAN',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  SET: 'SET',
  DATETIME: 'DATETIME',
  NOT_SPECIFIED: 'NOT_SPECIFIED'
};

export function matcherTypesMapper(matcherType: string) {
  const type = matcherTypes[matcherType];
  if (type) return type;
  else return matcherTypes.UNDEFINED;
}
