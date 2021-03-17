import { ERROR_EVENT_TYPE_FORMAT, ERROR_NULL, ERROR_INVALID, ERROR_EMPTY } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { isString } from '../lang';

const EVENT_TYPE_REGEX = /^[a-zA-Z0-9][-_.:a-zA-Z0-9]{0,79}$/;

export function validateEvent(log: ILogger, maybeEvent: any, method: string): string | false {
  if (maybeEvent == undefined) { // eslint-disable-line eqeqeq
    log.error(ERROR_NULL, [method]);
  } else if (!isString(maybeEvent)) {
    log.error(ERROR_INVALID, [method]);
  } else { // It is a string.
    if (maybeEvent.length === 0) {
      log.error(ERROR_EMPTY, [method]);
    } else if (!EVENT_TYPE_REGEX.test(maybeEvent)) {
      log.error(ERROR_EVENT_TYPE_FORMAT, [method, maybeEvent]);
    } else {
      return maybeEvent;
    }
  }

  return false;
}
