import { SplitIO } from '../../types';
import { IMatcherDto } from '../types';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:value');
import { ILogger } from '../../logger/types';
import sanitizeValue from './sanitize';

function parseValue(key: string, attributeName: string | null, attributes: SplitIO.Attributes, log: ILogger) {
  let value = undefined;
  if (attributeName) {
    if (attributes) {
      value = attributes[attributeName];
      log.debug(`Extracted attribute [${attributeName}], [${value}] will be used for matching.`);
    } else {
      log.warn(`Defined attribute [${attributeName}], no attributes received.`);
    }
  } else {
    value = key;
  }

  return value;
}

/**
 * Defines value to be matched (key / attribute).
 */
export default function value(key: string, matcherDto: IMatcherDto, attributes: SplitIO.Attributes, log: ILogger) {
  const attributeName = matcherDto.attribute;
  const valueToMatch = parseValue(key, attributeName, attributes, log);
  const sanitizedValue = sanitizeValue(matcherDto.type, valueToMatch, matcherDto.dataType, attributes, log);

  if (sanitizedValue !== undefined) {
    return sanitizedValue;
  } else {
    log.warn(`Value ${valueToMatch} ${attributeName ? ' for attribute ' + attributeName : ''}doesn't match with expected type.`);
    return;
  }
}
