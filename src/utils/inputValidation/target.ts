import { isObject } from '../lang';
import SplitIO from '../../../types/splitio';
import { ILogger } from '../../logger/types';
import { validateKey } from './key';
import { validateAttributes } from './attributes';
import { ERROR_NOT_PLAIN_OBJECT } from '../../logger/constants';

export function validateTarget(log: ILogger, maybeTarget: any, method: string): SplitIO.Target | false {
  if (!isObject(maybeTarget)) {
    log.error(ERROR_NOT_PLAIN_OBJECT, [method, 'target']);
    return false;
  }

  const key = validateKey(log, maybeTarget.key, method);
  if (key === false) return false;

  const attributes = validateAttributes(log, maybeTarget.attributes, method);
  if (attributes === false) return false;

  return { ...maybeTarget, key, attributes };
}
