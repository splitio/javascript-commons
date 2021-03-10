import { ERROR_35, ERROR_36, ERROR_37, WARN_19 } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { isString } from '../lang';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('');

const CAPITAL_LETTERS_REGEX = /[A-Z]/;

export function validateTrafficType(log: ILogger, maybeTT: any, method: string): string | false {
  if (maybeTT == undefined) { // eslint-disable-line eqeqeq
    log.error(ERROR_35, [method]);
  } else if (!isString(maybeTT)) {
    log.error(ERROR_36, [method]);
  } else {
    if (maybeTT.length === 0) {
      log.error(ERROR_37, [method]);
    } else {
      if (CAPITAL_LETTERS_REGEX.test(maybeTT)) {
        log.warn(WARN_19, [method]);
        maybeTT = maybeTT.toLowerCase();
      }

      return maybeTT;
    }
  }

  return false;
}
