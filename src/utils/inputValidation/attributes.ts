import { isObject } from '../lang';
import { SplitIO } from '../../types';
import { ILogger } from '../../logger/types';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('');

export function validateAttributes(log: ILogger, maybeAttrs: any, method: string): SplitIO.Attributes | undefined | false {
  // Attributes are optional
  if (isObject(maybeAttrs) || maybeAttrs == undefined) // eslint-disable-line eqeqeq
    return maybeAttrs;

  log.error(`${method}: attributes must be a plain object.`);
  return false;
}
