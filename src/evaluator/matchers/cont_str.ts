import { isString } from '../../utils/lang';
import { ILogger } from '../../logger/types';
import { DEBUG_9 } from '../../logger/constants';

export default function containsStringMatcherContext(log: ILogger, ruleAttr: string[]) /*: Function */ {
  return function containsStringMatcher(runtimeAttr: string): boolean {
    let contains = ruleAttr.some(e => isString(runtimeAttr) && runtimeAttr.indexOf(e) > -1);

    log.debug(DEBUG_9, [runtimeAttr, ruleAttr, contains]);

    return contains;
  };
}
