import { ERROR_22, ERROR_32, WARN_17, ERROR_33 } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { isString } from '../lang';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('');

// include BOM and nbsp
const TRIMMABLE_SPACES_REGEX = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/;

export function validateSplit(log: ILogger, maybeSplit: any, method: string, item = 'split name'): string | false {
  if (maybeSplit == undefined) { // eslint-disable-line eqeqeq
    log.error(ERROR_22, [method, item, item]);
  } else if (!isString(maybeSplit)) {
    log.error(ERROR_32, [method, item, item]);
  } else {
    if (TRIMMABLE_SPACES_REGEX.test(maybeSplit)) {
      log.warn(WARN_17, [method, item, maybeSplit]);
      maybeSplit = maybeSplit.trim();
    }

    if (maybeSplit.length > 0) {
      return maybeSplit;
    } else {
      log.error(ERROR_33, [method, item, item]);
    }
  }

  return false;
}
