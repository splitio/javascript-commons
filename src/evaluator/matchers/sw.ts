// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';
import { startsWith } from '../../utils/lang';

export default function startsWithMatcherContext(log: ILogger, ruleAttr: string[]) /*: Function */ {
  return function startsWithMatcher(runtimeAttr: string): boolean {
    let matches = ruleAttr.some(e => startsWith(runtimeAttr, e));

    log.d(`[startsWithMatcher] ${runtimeAttr} starts with ${ruleAttr}? ${matches}`);

    return matches;
  };
}
