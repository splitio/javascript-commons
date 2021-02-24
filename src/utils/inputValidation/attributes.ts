import { isObject } from '../lang';
import { logFactory } from '../../logger/sdkLogger';
import { SplitIO } from '../../types';
const log = logFactory('');

export function validateAttributes(maybeAttrs: any, method: string): SplitIO.Attributes | undefined | false {
  // Attributes are optional
  if (isObject(maybeAttrs) || maybeAttrs == undefined) // eslint-disable-line eqeqeq
    return maybeAttrs;

  log.e(`${method}: attributes must be a plain object.`);
  return false;
}
