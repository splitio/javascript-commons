import { SplitIO } from '../../types';
import { IMatcherDto } from '../types';
import { ILogger } from '../../logger/types';
import { sanitize } from './sanitize';
import { ENGINE_VALUE, ENGINE_VALUE_NO_ATTRIBUTES, ENGINE_VALUE_INVALID } from '../../logger/constants';

function parseValue(log: ILogger, key: string, attributeName: string | null, attributes?: SplitIO.Attributes) {
  let value = undefined;
  if (attributeName) {
    if (attributes) {
      value = attributes[attributeName];
      log.debug(ENGINE_VALUE, [attributeName, value]);
    } else {
      log.warn(ENGINE_VALUE_NO_ATTRIBUTES, [attributeName]);
    }
  } else {
    value = key;
  }

  return value;
}

/**
 * Defines value to be matched (key / attribute).
 */
export function sanitizeValue(log: ILogger, key: string, matcherDto: IMatcherDto, attributes?: SplitIO.Attributes) {
  const attributeName = matcherDto.attribute;
  const valueToMatch = parseValue(log, key, attributeName, attributes);
  const sanitizedValue = sanitize(log, matcherDto.type, valueToMatch, matcherDto.dataType, attributes);

  if (sanitizedValue !== undefined) {
    return sanitizedValue;
  } else {
    log.warn(ENGINE_VALUE_INVALID, [valueToMatch + (attributeName ? ' for attribute ' + attributeName : '')]);
    return;
  }
}
