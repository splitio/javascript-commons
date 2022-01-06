import { findIndex } from '../../utils/lang';
import { matcherTypes, matcherTypesMapper, matcherDataTypes } from '../matchers/matcherTypes';
import { segmentTransform } from './segment';
import { whitelistTransform } from './whitelist';
import { setTransform } from './set';
import { numericTransform } from './unaryNumeric';
import { zeroSinceHH, zeroSinceSS } from '../convertions';
import { IBetweenMatcherData, IInSegmentMatcherData, ISplitMatcher, IUnaryNumericMatcherData, IWhitelistMatcherData } from '../../dtos/types';
import { IMatcherDto } from '../types';

/**
 * Flat the complex matcherGroup structure into something handy.
 */
export function matchersTransform(matchers: ISplitMatcher[]): IMatcherDto[] {

  let parsedMatchers = matchers.map(matcher => {
    let {
      matcherType                                   /* string */,
      negate                                        /* boolean */,
      keySelector                                   /* keySelectorObject */,
      userDefinedSegmentMatcherData: segmentObject  /* segmentObject */,
      whitelistMatcherData: whitelistObject         /* whiteListObject, provided by 'WHITELIST', set and string matchers */,
      unaryNumericMatcherData: unaryNumericObject   /* unaryNumericObject */,
      betweenMatcherData: betweenObject             /* betweenObject */,
      dependencyMatcherData: dependencyObject       /* dependencyObject */,
      booleanMatcherData,
      stringMatcherData
    } = matcher;

    let attribute = keySelector && keySelector.attribute;
    let type = matcherTypesMapper(matcherType);
    // As default input data type we use string (even for ALL_KEYS)
    let dataType = matcherDataTypes.STRING;
    let value = undefined;

    if (type === matcherTypes.IN_SEGMENT) {
      value = segmentTransform(segmentObject as IInSegmentMatcherData);
    } else if (type === matcherTypes.WHITELIST) {
      value = whitelistTransform(whitelistObject as IWhitelistMatcherData);
    } else if (type === matcherTypes.EQUAL_TO) {
      value = numericTransform(unaryNumericObject as IUnaryNumericMatcherData);
      dataType = matcherDataTypes.NUMBER;

      if ((unaryNumericObject as IUnaryNumericMatcherData).dataType === 'DATETIME') {
        value = zeroSinceHH(value);
        dataType = matcherDataTypes.DATETIME;
      }
    } else if (type === matcherTypes.GREATER_THAN_OR_EQUAL_TO ||
      type === matcherTypes.LESS_THAN_OR_EQUAL_TO) {
      value = numericTransform(unaryNumericObject as IUnaryNumericMatcherData);
      dataType = matcherDataTypes.NUMBER;

      if ((unaryNumericObject as IUnaryNumericMatcherData).dataType === 'DATETIME') {
        value = zeroSinceSS(value);
        dataType = matcherDataTypes.DATETIME;
      }
    } else if (type === matcherTypes.BETWEEN) {
      value = betweenObject as IBetweenMatcherData;
      dataType = matcherDataTypes.NUMBER;

      if (value.dataType === 'DATETIME') {
        value.start = zeroSinceSS(value.start);
        value.end = zeroSinceSS(value.end);
        dataType = matcherDataTypes.DATETIME;
      }
    } else if (
      type === matcherTypes.EQUAL_TO_SET ||
      type === matcherTypes.CONTAINS_ANY_OF_SET ||
      type === matcherTypes.CONTAINS_ALL_OF_SET ||
      type === matcherTypes.PART_OF_SET
    ) {
      value = setTransform(whitelistObject as IWhitelistMatcherData);
      dataType = matcherDataTypes.SET;
    } else if (
      type === matcherTypes.STARTS_WITH ||
      type === matcherTypes.ENDS_WITH ||
      type === matcherTypes.CONTAINS_STRING
    ) {
      value = setTransform(whitelistObject as IWhitelistMatcherData);
    } else if (type === matcherTypes.IN_SPLIT_TREATMENT) {
      value = dependencyObject;
      dataType = matcherDataTypes.NOT_SPECIFIED;
    } else if (type === matcherTypes.EQUAL_TO_BOOLEAN) {
      dataType = matcherDataTypes.BOOLEAN;
      value = booleanMatcherData;
    } else if (type === matcherTypes.MATCHES_STRING) {
      value = stringMatcherData;
    }

    return {
      attribute,        // attribute over we should do the matching, undefined means 'use the key'
      negate,           // should we negate the result?
      type,             // which kind of matcher we should evaluate
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
