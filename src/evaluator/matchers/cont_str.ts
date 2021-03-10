import { isString } from '../../utils/lang';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';
import { DEBUG_9 } from '../../logger/codesConstants';

export default function containsStringMatcherContext(log: ILogger, ruleAttr: string[]) /*: Function */ {
  return function containsStringMatcher(runtimeAttr: string): boolean {
    let contains = ruleAttr.some(e => isString(runtimeAttr) && runtimeAttr.indexOf(e) > -1);

    log.debug(DEBUG_9, [runtimeAttr, ruleAttr, contains]);

    return contains;
  };
}
