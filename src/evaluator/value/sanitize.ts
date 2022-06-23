import { SplitIO } from '../../types';
import { IDependencyMatcherValue } from '../types';
import { ILogger } from '../../logger/types';
import { isObject, uniq, toString, toNumber } from '../../utils/lang';
import { zeroSinceHH, zeroSinceSS } from '../convertions';
import { matcherTypes, matcherDataTypes } from '../matchers/matcherTypes';
import { ENGINE_SANITIZE } from '../../logger/constants';

function sanitizeNumber(val: any): number | undefined {
  const num = toNumber(val);
  return isNaN(num) ? undefined : num;
}

function sanitizeString(val: any): string | undefined {
  let valueToSanitize = val;

  if (isObject(val)) {
    // If the value is an object and is not a key, discard it.
    valueToSanitize = val.matchingKey ? val.matchingKey : undefined;
  }

  const str = toString(valueToSanitize);
  return str ? str : undefined;
}

function sanitizeArray(val: any): string[] | undefined {
  const arr = Array.isArray(val) ? uniq(val.map(e => e + '')) : [];
  return arr.length ? arr : undefined;
}

function sanitizeBoolean(val: any): boolean | undefined {
  if (val === true || val === false) return val;

  if (typeof val === 'string') {
    const lowerCaseValue = val.toLocaleLowerCase();

    if (lowerCaseValue === 'true') return true;
    if (lowerCaseValue === 'false') return false;
  }

  return undefined;
}

function dependencyProcessor(sanitizedValue: string, attributes?: SplitIO.Attributes): IDependencyMatcherValue {
  return {
    key: sanitizedValue,
    attributes
  };
}

/**
 * We can define a pre-processing for the value, to be executed prior to matcher evaluation.
 */
function getProcessingFunction(matcherTypeID: number, dataType: string) {
  switch (matcherTypeID) {
    case matcherTypes.EQUAL_TO:
      return dataType === 'DATETIME' ? zeroSinceHH : undefined;
    case matcherTypes.GREATER_THAN_OR_EQUAL_TO:
    case matcherTypes.LESS_THAN_OR_EQUAL_TO:
    case matcherTypes.BETWEEN:
      return dataType === 'DATETIME' ? zeroSinceSS : undefined;
    case matcherTypes.IN_SPLIT_TREATMENT:
      return dependencyProcessor;
    default:
      return undefined;
  }
}

/**
 * Sanitize matcher value
 */
export function sanitize(log: ILogger, matcherTypeID: number, value: string | number | boolean | Array<string | number> | undefined, dataType: string, attributes?: SplitIO.Attributes) {
  const processor = getProcessingFunction(matcherTypeID, dataType);
  let sanitizedValue: string | number | boolean | Array<string | number> | IDependencyMatcherValue | undefined;

  switch (dataType) {
    case matcherDataTypes.NUMBER:
    case matcherDataTypes.DATETIME:
      sanitizedValue = sanitizeNumber(value);
      break;
    case matcherDataTypes.STRING:
      sanitizedValue = sanitizeString(value);
      break;
    case matcherDataTypes.SET:
      sanitizedValue = sanitizeArray(value);
      break;
    case matcherDataTypes.BOOLEAN:
      sanitizedValue = sanitizeBoolean(value);
      break;
    case matcherDataTypes.NOT_SPECIFIED:
      sanitizedValue = value;
      break;
    default:
      sanitizedValue = undefined;
  }

  if (processor) {
    // @ts-ignore
    sanitizedValue = processor(sanitizedValue, attributes);
  }

  log.debug(ENGINE_SANITIZE, [value, dataType, sanitizedValue instanceof Object ? JSON.stringify(sanitizedValue) : sanitizedValue]);

  return sanitizedValue;
}
