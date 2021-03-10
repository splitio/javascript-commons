import { isObject, isString, isFiniteNumber, toString } from '../lang';
import { SplitIO } from '../../types';
import { ILogger } from '../../logger/types';
import { ERROR_22, WARN_15, ERROR_25, ERROR_23, ERROR_24, ERROR_26 } from '../../logger/constants';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('');

const KEY_MAX_LENGTH = 250;

function validateKeyValue(log: ILogger, maybeKey: any, method: string, type: string): string | false {
  if (maybeKey == undefined) { // eslint-disable-line eqeqeq
    log.error(ERROR_22, [method, type, type]);
    return false;
  }
  if (isFiniteNumber(maybeKey)) {
    log.warn(WARN_15, [method, type, maybeKey]);
    return toString(maybeKey);
  }
  if (isString(maybeKey)) {
    // It's a string, start by trimming the value.
    maybeKey = maybeKey.trim();

    // It's aaaaaall good.
    if (maybeKey.length > 0 && maybeKey.length <= KEY_MAX_LENGTH) return maybeKey;

    if (maybeKey.length === 0) {
      log.error(ERROR_25, [method, type]);
    } else if (maybeKey.length > KEY_MAX_LENGTH) {
      log.error(ERROR_23, [method, type, type]);
    }
  } else {
    log.error(ERROR_24, [method, type, type]);
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

    log.error(ERROR_26, [method]);
    return false;
  } else {
    return validateKeyValue(log, maybeKey, method, 'key');
  }
}
