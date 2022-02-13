import { isObject, isString, isFiniteNumber, isBoolean } from '../lang';
import { objectAssign } from '../lang/objectAssign';
import { SplitIO } from '../../types';
import { ILogger } from '../../logger/types';
import { ERROR_NOT_PLAIN_OBJECT, ERROR_SIZE_EXCEEDED, WARN_SETTING_NULL, WARN_TRIMMING_PROPERTIES } from '../../logger/constants';

const ECMA_SIZES = {
  NULL: 0, // While on the JSON it's going to occupy more space, we'll take it as 0 for the approximation.
  STRING: 2,
  BOOLEAN: 4,
  NUMBER: 8
};
const MAX_PROPERTIES_AMOUNT = 300;
const MAX_EVENT_SIZE = 1024 * 32;
const BASE_EVENT_SIZE = 1024; // We assume 1kb events without properties (avg measured)

export function validateEventProperties(log: ILogger, maybeProperties: any, method: string): { properties: SplitIO.Properties | null | false, size: number } {
  if (maybeProperties == undefined) return { properties: null, size: BASE_EVENT_SIZE }; // eslint-disable-line eqeqeq

  if (!isObject(maybeProperties)) {
    log.error(ERROR_NOT_PLAIN_OBJECT, [method, 'properties']);
    return { properties: false, size: BASE_EVENT_SIZE };
  }

  const keys = Object.keys(maybeProperties);
  // Shallow clone
  const clone = objectAssign({}, maybeProperties);
  // To avoid calculating the size twice we'll return it from here.
  const output = {
    properties: clone,
    size: BASE_EVENT_SIZE            // We assume 1kb events without properties (avg measured)
  };

  if (keys.length > MAX_PROPERTIES_AMOUNT) {
    log.warn(WARN_TRIMMING_PROPERTIES, [method]);
  }

  for (let i = 0; i < keys.length; i++) {
    output.size += keys[i].length * ECMA_SIZES.STRING; // Count the size of the key which is always a string.

    let val = clone[keys[i]];

    const isStringVal = isString(val);
    const isFiniteVal = isFiniteNumber(val);
    const isBoolVal = isBoolean(val);
    let isNullVal = val === null;

    if (!(isStringVal || isFiniteVal || isBoolVal || isNullVal)) { // If it's not of valid type.
      clone[keys[i]] = null;
      val = null;
      isNullVal = true;
      log.warn(WARN_SETTING_NULL, [method, keys[i]]);
    }

    if (isNullVal) output.size += ECMA_SIZES.NULL;
    else if (isFiniteVal) output.size += ECMA_SIZES.NUMBER;
    else if (isBoolVal) output.size += ECMA_SIZES.BOOLEAN;
    else if (isStringVal) output.size += val.length * ECMA_SIZES.STRING;

    if (output.size > MAX_EVENT_SIZE) {
      log.error(ERROR_SIZE_EXCEEDED, [method]);
      output.properties = false;
      break;
    }
  }

  return output;
}
