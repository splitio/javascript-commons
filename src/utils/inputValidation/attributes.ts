import { isObject } from '../lang';
import { SplitIO } from '../../types';
import { ILogger } from '../../logger/types';
import { ERROR_13 } from '../../logger/constants';

export function validateAttributes(log: ILogger, maybeAttrs: any, method: string): SplitIO.Attributes | undefined | false {
  // Attributes are optional
  if (isObject(maybeAttrs) || maybeAttrs == undefined) // eslint-disable-line eqeqeq
    return maybeAttrs;

  log.error(ERROR_13, [method]);
  return false;
}
