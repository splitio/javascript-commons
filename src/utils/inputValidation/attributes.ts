import { isObject } from '../lang';
import { SplitIO } from '../../types';
import { ILogger } from '../../logger/types';
import { ERROR_NOT_PLAIN_OBJECT } from '../../logger/constants';

export function validateAttributes(log: ILogger, maybeAttrs: any, method: string): SplitIO.Attributes | undefined | false {
  // Attributes are optional
  if (isObject(maybeAttrs) || maybeAttrs == undefined) // eslint-disable-line eqeqeq
    return maybeAttrs;

  log.error(ERROR_NOT_PLAIN_OBJECT, [method, 'attributes']);
  return false;
}
