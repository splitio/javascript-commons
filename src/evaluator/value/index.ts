import { SplitIO } from '../../types';
import { IMatcherDto } from '../types';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:value');
import { ILogger } from '../../logger/types';
import sanitizeValue from './sanitize';
import { DEBUG_24, WARN_1, WARN_0 } from '../../logger/codesConstants';

function parseValue(log: ILogger, key: string, attributeName: string | null, attributes: SplitIO.Attributes) {
  let value = undefined;
  if (attributeName) {
    if (attributes) {
      value = attributes[attributeName];
      log.debug(DEBUG_24, [attributeName, value]);
    } else {
      log.warn(WARN_1, [attributeName]);
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
    log.warn(WARN_0, [valueToMatch, attributeName ? ' for attribute ' + attributeName : '']);
    return;
  }
}
