import { SplitIO } from '../../types';
import { IMatcherDto } from '../types';
import { ILogger } from '../../logger/types';
import sanitizeValue from './sanitize';
import { DEBUG_24, WARN_ENGINE_NO_ATTRIBUTES, WARN_ENGINE_INVALID_VALUE } from '../../logger/constants';

function parseValue(log: ILogger, key: string, attributeName: string | null, attributes: SplitIO.Attributes) {
  let value = undefined;
  if (attributeName) {
    if (attributes) {
      value = attributes[attributeName];
      log.debug(DEBUG_24, [attributeName, value]);
    } else {
      log.warn(WARN_ENGINE_NO_ATTRIBUTES, [attributeName]);
    }
  } else {
    value = key;
  }

  return value;
}

/**
 * Defines value to be matched (key / attribute).
 */
export default function value(log: ILogger, key: string, matcherDto: IMatcherDto, attributes: SplitIO.Attributes) {
  const attributeName = matcherDto.attribute;
  const valueToMatch = parseValue(log, key, attributeName, attributes);
  const sanitizedValue = sanitizeValue(log, matcherDto.type, valueToMatch, matcherDto.dataType, attributes);

  if (sanitizedValue !== undefined) {
    return sanitizedValue;
  } else {
    log.warn(WARN_ENGINE_INVALID_VALUE, [valueToMatch + (attributeName ? ' for attribute ' + attributeName : '')]);
    return;
  }
}
