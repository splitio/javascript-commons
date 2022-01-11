import { isString } from '../../utils/lang';
import { ILogger } from '../../logger/types';
import { ENGINE_MATCHER_CONTAINS_STRING } from '../../logger/constants';

export function containsStringMatcherContext(log: ILogger, ruleAttr: string[]) /*: Function */ {
  return function containsStringMatcher(runtimeAttr: string): boolean {
    let contains = ruleAttr.some(e => isString(runtimeAttr) && runtimeAttr.indexOf(e) > -1);

    log.debug(ENGINE_MATCHER_CONTAINS_STRING, [runtimeAttr, ruleAttr, contains]);

    return contains;
  };
}
