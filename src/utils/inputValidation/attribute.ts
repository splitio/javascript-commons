import { isString, isFiniteNumber, isBoolean } from '../../utils/lang';
import { ILogger } from '../../logger/types';

export function validateAttribute(log: ILogger, attributeKey: string, attributeValue: Object, method: string): boolean {
  if (!isString(attributeKey) || attributeKey.length === 0) {
    log.warn(`${method}: you passed an invalid attribute name, attribute name must be a non-empty string.`);
    return false;
  }

  const isStringVal = isString(attributeValue);
  const isFiniteVal = isFiniteNumber(attributeValue);
  const isBoolVal = isBoolean(attributeValue);
  const isArrayVal = Array.isArray(attributeValue);

  if (!(isStringVal || isFiniteVal || isBoolVal || isArrayVal)) { // If it's not of valid type.
    log.warn(`${method}: you passed an invalid attribute value for ${attributeKey}. Acceptable types are: string, number, boolean and array of strings.`);
    return false;
  }

  return true;
}
