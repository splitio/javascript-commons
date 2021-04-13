import { ERROR_NULL, ERROR_INVALID, ERROR_EMPTY, WARN_LOWERCASE_TRAFFIC_TYPE } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { isString } from '../lang';

const CAPITAL_LETTERS_REGEX = /[A-Z]/;
const item = 'traffic_type';

export function validateTrafficType(log: ILogger, maybeTT: any, method: string): string | false {
  if (maybeTT == undefined) { // eslint-disable-line eqeqeq
    log.error(ERROR_NULL, [method, item]);
  } else if (!isString(maybeTT)) {
    log.error(ERROR_INVALID, [method, item]);
  } else {
    if (maybeTT.length === 0) {
      log.error(ERROR_EMPTY, [method, item]);
    } else {
      if (CAPITAL_LETTERS_REGEX.test(maybeTT)) {
        log.warn(WARN_LOWERCASE_TRAFFIC_TYPE, [method]);
        maybeTT = maybeTT.toLowerCase();
      }

      return maybeTT;
    }
  }

  return false;
}
