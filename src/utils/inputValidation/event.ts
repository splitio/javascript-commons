import { ERROR_14, ERROR_15, ERROR_16, ERROR_17 } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { isString } from '../lang';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('');

const EVENT_TYPE_REGEX = /^[a-zA-Z0-9][-_.:a-zA-Z0-9]{0,79}$/;

export function validateEvent(log: ILogger, maybeEvent: any, method: string): string | false {
  if (maybeEvent == undefined) { // eslint-disable-line eqeqeq
    log.error(ERROR_15, [method]);
  } else if (!isString(maybeEvent)) {
    log.error(ERROR_16, [method]);
  } else { // It is a string.
    if (maybeEvent.length === 0) {
      log.error(ERROR_17, [method]);
    } else if (!EVENT_TYPE_REGEX.test(maybeEvent)) {
      log.error(ERROR_14, [method, maybeEvent]);
    } else {
      return maybeEvent;
    }
  }

  return false;
}
