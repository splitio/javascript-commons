import { findIndex } from '../../utils/lang';
import { matcherTypes, matcherTypesMapper, matcherDataTypes } from '../matchers/matcherTypes';
import { segmentTransform } from './segment';
import { whitelistTransform } from './whitelist';
import { numericTransform } from './unaryNumeric';
import { zeroSinceHH, zeroSinceSS } from '../convertions';
import { IBetweenMatcherData, IInSegmentMatcherData, ISplitMatcher, IUnaryNumericMatcherData } from '../../dtos/types';
import { IMatcherDto } from '../types';

/**
 * Flat the complex matcherGroup structure into something handy.
 */
export function matchersTransform(matchers: ISplitMatcher[]): IMatcherDto[] {

  let parsedMatchers = matchers.map(matcher => {
    let {
      matcherType,
      negate,
      keySelector,
      userDefinedSegmentMatcherData,
      whitelistMatcherData, /* whitelistObject, provided by 'WHITELIST', 'IN_LIST_SEMVER', set and string matchers */
      unaryNumericMatcherData,
      betweenMatcherData,
      dependencyMatcherData,
      booleanMatcherData,
      stringMatcherData,
      betweenStringMatcherData
    } = matcher;

    let attribute = keySelector && keySelector.attribute;
    let type = matcherTypesMapper(matcherType);
    // As default input data type we use string (even for ALL_KEYS)
    let dataType = matcherDataTypes.STRING;
    let value = undefined;

    if (type === matcherTypes.IN_SEGMENT) {
      value = segmentTransform(userDefinedSegmentMatcherData as IInSegmentMatcherData);
    } else if (type === matcherTypes.EQUAL_TO) {
      value = numericTransform(unaryNumericMatcherData as IUnaryNumericMatcherData);
      dataType = matcherDataTypes.NUMBER;

      if ((unaryNumericMatcherData as IUnaryNumericMatcherData).dataType === 'DATETIME') {
        value = zeroSinceHH(value);
        dataType = matcherDataTypes.DATETIME;
      }
    } else if (type === matcherTypes.GREATER_THAN_OR_EQUAL_TO ||
      type === matcherTypes.LESS_THAN_OR_EQUAL_TO) {
      value = numericTransform(unaryNumericMatcherData as IUnaryNumericMatcherData);
      dataType = matcherDataTypes.NUMBER;

      if ((unaryNumericMatcherData as IUnaryNumericMatcherData).dataType === 'DATETIME') {
        value = zeroSinceSS(value);
        dataType = matcherDataTypes.DATETIME;
      }
    } else if (type === matcherTypes.BETWEEN) {
      value = betweenMatcherData as IBetweenMatcherData;
      dataType = matcherDataTypes.NUMBER;

      if (value.dataType === 'DATETIME') {
        value.start = zeroSinceSS(value.start);
        value.end = zeroSinceSS(value.end);
        dataType = matcherDataTypes.DATETIME;
      }
    } else if (type === matcherTypes.BETWEEN_SEMVER) {
      value = betweenStringMatcherData;
    } else if (
      type === matcherTypes.EQUAL_TO_SET ||
      type === matcherTypes.CONTAINS_ANY_OF_SET ||
      type === matcherTypes.CONTAINS_ALL_OF_SET ||
      type === matcherTypes.PART_OF_SET
    ) {
      value = whitelistTransform(whitelistMatcherData);
      dataType = matcherDataTypes.SET;
    } else if (
      type === matcherTypes.WHITELIST ||
      type === matcherTypes.IN_LIST_SEMVER ||
      type === matcherTypes.STARTS_WITH ||
      type === matcherTypes.ENDS_WITH ||
      type === matcherTypes.CONTAINS_STRING
    ) {
      value = whitelistTransform(whitelistMatcherData);
    } else if (type === matcherTypes.IN_SPLIT_TREATMENT) {
      value = dependencyMatcherData;
      dataType = matcherDataTypes.NOT_SPECIFIED;
    } else if (type === matcherTypes.EQUAL_TO_BOOLEAN) {
      dataType = matcherDataTypes.BOOLEAN;
      value = booleanMatcherData;
    } else if (
      type === matcherTypes.MATCHES_STRING ||
      type === matcherTypes.EQUAL_TO_SEMVER ||
      type === matcherTypes.GREATER_THAN_OR_EQUAL_TO_SEMVER ||
      type === matcherTypes.LESS_THAN_OR_EQUAL_TO_SEMVER
    ) {
      value = stringMatcherData;
    }

    return {
      attribute,        // attribute over we should do the matching, undefined means 'use the key'
      negate,           // should we negate the result?
      type,             // which kind of matcher we should evaluate
      name: matcherType,// name of the matcher for logging purposes
      value,            // metadata used for the matching
      dataType          // runtime input data type
    };
  });

  if (findIndex(parsedMatchers, m => m.type === matcherTypes.UNDEFINED) === -1) {
    return parsedMatchers;
  } else {
    return [];
  }
}
