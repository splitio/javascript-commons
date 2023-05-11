import { ERROR_NULL, ERROR_INVALID, WARN_TRIMMING, ERROR_EMPTY } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { isString } from '../lang';

// include BOM and nbsp
const TRIMMABLE_SPACES_REGEX = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/;

export function validateSplit(log: ILogger, maybeSplit: any, method: string, item = 'feature flag name'): string | false {
  if (maybeSplit == undefined) { // eslint-disable-line eqeqeq
    log.error(ERROR_NULL, [method, item]);
  } else if (!isString(maybeSplit)) {
    log.error(ERROR_INVALID, [method, item]);
  } else {
    if (TRIMMABLE_SPACES_REGEX.test(maybeSplit)) {
      log.warn(WARN_TRIMMING, [method, item, maybeSplit]);
      maybeSplit = maybeSplit.trim();
    }

    if (maybeSplit.length > 0) {
      return maybeSplit;
    } else {
      log.error(ERROR_EMPTY, [method, item]);
    }
  }

  return false;
}
