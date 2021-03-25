import { isObject, isString, isFiniteNumber, toString } from '../lang';
import { SplitIO } from '../../types';
import { ILogger } from '../../logger/types';
import { ERROR_NULL, WARN_CONVERTING, ERROR_EMPTY, ERROR_TOO_LONG, ERROR_INVALID, ERROR_INVALID_KEY_OBJECT } from '../../logger/constants';

const KEY_MAX_LENGTH = 250;

function validateKeyValue(log: ILogger, maybeKey: any, method: string, type: string): string | false {
  if (maybeKey == undefined) { // eslint-disable-line eqeqeq
    log.error(ERROR_NULL, [method, type]);
    return false;
  }
  if (isFiniteNumber(maybeKey)) {
    log.warn(WARN_CONVERTING, [method, type, maybeKey]);
    return toString(maybeKey);
  }
  if (isString(maybeKey)) {
    // It's a string, start by trimming the value.
    maybeKey = maybeKey.trim();

    // It's aaaaaall good.
    if (maybeKey.length > 0 && maybeKey.length <= KEY_MAX_LENGTH) return maybeKey;

    if (maybeKey.length === 0) {
      log.error(ERROR_EMPTY, [method, type]);
    } else if (maybeKey.length > KEY_MAX_LENGTH) {
      log.error(ERROR_TOO_LONG, [method, type]);
    }
  } else {
    log.error(ERROR_INVALID, [method, type]);
  }

  return false;
}

export function validateKey(log: ILogger, maybeKey: any, method: string): SplitIO.SplitKey | false {
  if (isObject(maybeKey)) {
    // Validate key object
    const matchingKey = validateKeyValue(log, maybeKey.matchingKey, method, 'matchingKey');
    const bucketingKey = validateKeyValue(log, maybeKey.bucketingKey, method, 'bucketingKey');

    if (matchingKey && bucketingKey) return {
      matchingKey, bucketingKey
    };

    log.error(ERROR_INVALID_KEY_OBJECT, [method]);
    return false;
  } else {
    return validateKeyValue(log, maybeKey, method, 'key');
  }
}
