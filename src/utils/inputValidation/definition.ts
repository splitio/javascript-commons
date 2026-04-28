import { ERROR_NULL, ERROR_INVALID, WARN_TRIMMING, ERROR_EMPTY } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { isString } from '../lang';

// include BOM and nbsp
const TRIMMABLE_SPACES_REGEX = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/;

export function validateDefinition(log: ILogger, maybeDefinition: any, method: string, item = 'feature flag name'): string | false {
  if (maybeDefinition == undefined) { // eslint-disable-line eqeqeq
    log.error(ERROR_NULL, [method, item]);
  } else if (!isString(maybeDefinition)) {
    log.error(ERROR_INVALID, [method, item]);
  } else {
    if (TRIMMABLE_SPACES_REGEX.test(maybeDefinition)) {
      log.warn(WARN_TRIMMING, [method, item, maybeDefinition]);
      maybeDefinition = maybeDefinition.trim();
    }

    if (maybeDefinition.length > 0) {
      return maybeDefinition;
    } else {
      log.error(ERROR_EMPTY, [method, item]);
    }
  }

  return false;
}
