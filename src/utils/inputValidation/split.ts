import { ILogger } from '../../logger/types';
import { isString } from '../lang';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('');

// include BOM and nbsp
const TRIMMABLE_SPACES_REGEX = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/;

export function validateSplit(log: ILogger, maybeSplit: any, method: string, item = 'split name'): string | false {
  if (maybeSplit == undefined) { // eslint-disable-line eqeqeq
    log.e(`${method}: you passed a null or undefined ${item}, ${item} must be a non-empty string.`);
  } else if (!isString(maybeSplit)) {
    log.e(`${method}: you passed an invalid ${item}, ${item} must be a non-empty string.`);
  } else {
    if (TRIMMABLE_SPACES_REGEX.test(maybeSplit)) {
      log.w(`${method}: ${item} "${maybeSplit}" has extra whitespace, trimming.`);
      maybeSplit = maybeSplit.trim();
    }

    if (maybeSplit.length > 0) {
      return maybeSplit;
    } else {
      log.e(`${method}: you passed an empty ${item}, ${item} must be a non-empty string.`);
    }
  }

  return false;
}
