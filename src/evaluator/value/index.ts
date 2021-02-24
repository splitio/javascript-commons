import { SplitIO } from '../../types';
import { logFactory } from '../../logger/sdkLogger';
import { IMatcherDto } from '../types';
const log = logFactory('splitio-engine:value');
import sanitizeValue from './sanitize';

function parseValue(key: string, attributeName: string | null, attributes: SplitIO.Attributes) {
  let value = undefined;
  if (attributeName) {
    if (attributes) {
      value = attributes[attributeName];
      log.d(`Extracted attribute [${attributeName}], [${value}] will be used for matching.`);
    } else {
      log.w(`Defined attribute [${attributeName}], no attributes received.`);
    }
  } else {
    value = key;
  }

  return value;
}

/**
 * Defines value to be matched (key / attribute).
 */
export default function value(key: string, matcherDto: IMatcherDto, attributes: SplitIO.Attributes) {
  const attributeName = matcherDto.attribute;
  const valueToMatch = parseValue(key, attributeName, attributes);
  const sanitizedValue = sanitizeValue(matcherDto.type, valueToMatch, matcherDto.dataType, attributes);

  if (sanitizedValue !== undefined) {
    return sanitizedValue;
  } else {
    log.w(`Value ${valueToMatch} ${attributeName ? `for attribute ${attributeName} ` : + ''}doesn't match with expected type.`);
    return;
  }
}
