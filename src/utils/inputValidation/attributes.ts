import { isObject } from '../lang';
import { SplitIO } from '../../types';
import { ILogger } from '../../logger/types';
import { validateAttribute } from './attribute';
import { ERROR_NOT_PLAIN_OBJECT } from '../../logger/constants';

export function validateAttributes(log: ILogger, maybeAttrs: any, method: string): SplitIO.Attributes | undefined | false {
  // Attributes are optional
  if (maybeAttrs == undefined || isObject(maybeAttrs)) // eslint-disable-line eqeqeq
    return maybeAttrs;

  log.error(ERROR_NOT_PLAIN_OBJECT, [method, 'attributes']);
  return false;
}

export function validateAttributesDeep(log: ILogger, maybeAttributes: Record<string, Object>, method: string): boolean {
  if (!validateAttributes(log, maybeAttributes, method)) return false;

  let result = true;
  Object.keys(maybeAttributes).forEach(attributeKey => {
    if (!validateAttribute(log, attributeKey, maybeAttributes[attributeKey], method))
      result = false;
  });

  return result;
}
