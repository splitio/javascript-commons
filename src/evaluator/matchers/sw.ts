import { DEBUG_22 } from '../../logger/constants';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';
import { startsWith } from '../../utils/lang';

export default function startsWithMatcherContext(log: ILogger, ruleAttr: string[]) /*: Function */ {
  return function startsWithMatcher(runtimeAttr: string): boolean {
    let matches = ruleAttr.some(e => startsWith(runtimeAttr, e));

    log.debug(DEBUG_22, [runtimeAttr, ruleAttr, matches]);

    return matches;
  };
}
