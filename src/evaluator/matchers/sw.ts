import { logFactory } from '../../logger/sdkLogger';
const log = logFactory('splitio-engine:matcher');
import { startsWith } from '../../utils/lang';

export default function startsWithMatcherContext(ruleAttr: string[]) /*: Function */ {
  return function startsWithMatcher(runtimeAttr: string): boolean {
    let matches = ruleAttr.some(e => startsWith(runtimeAttr, e));

    log.debug(`[startsWithMatcher] ${runtimeAttr} starts with ${ruleAttr}? ${matches}`);

    return matches;
  };
}
