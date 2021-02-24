import { isObject, isString, isFiniteNumber, toString } from '../lang';
import { logFactory } from '../../logger/sdkLogger';
import { SplitIO } from '../../types';
const log = logFactory('');

const KEY_MAX_LENGTH = 250;

function validateKeyValue(maybeKey: any, method: string, type: string): string | false {
  if (maybeKey == undefined) { // eslint-disable-line eqeqeq
    log.e(`${method}: you passed a null or undefined ${type}, ${type} must be a non-empty string.`);
    return false;
  }
  if (isFiniteNumber(maybeKey)) {
    log.w(`${method}: ${type} "${maybeKey}" is not of type string, converting.`);
    return toString(maybeKey);
  }
  if (isString(maybeKey)) {
    // It's a string, start by trimming the value.
    maybeKey = maybeKey.trim();

    // It's aaaaaall good.
    if (maybeKey.length > 0 && maybeKey.length <= KEY_MAX_LENGTH) return maybeKey;

    if (maybeKey.length === 0) {
      log.e(`${method}: you passed an empty string, ${type} must be a non-empty string.`);
    } else if (maybeKey.length > KEY_MAX_LENGTH) {
      log.e(`${method}: ${type} too long, ${type} must be 250 characters or less.`);
    }
  } else {
    log.e(`${method}: you passed an invalid ${type} type, ${type} must be a non-empty string.`);
  }

  return false;
}

export function validateKey(maybeKey: any, method: string): SplitIO.SplitKey | false {
  if (isObject(maybeKey)) {
    // Validate key object
    const matchingKey = validateKeyValue(maybeKey.matchingKey, method, 'matchingKey');
    const bucketingKey = validateKeyValue(maybeKey.bucketingKey, method, 'bucketingKey');

    if (matchingKey && bucketingKey) return {
      matchingKey, bucketingKey
    };

    log.e(`${method}: Key must be an object with bucketingKey and matchingKey with valid string properties.`);
    return false;
  } else {
    return validateKeyValue(maybeKey, method, 'key');
  }
}
