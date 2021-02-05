import { logFactory } from '../../logger/sdkLogger';
const log = logFactory('splitio-engine:matcher');
import { endsWith as strEndsWith } from '../../utils/lang';

export default function endsWithMatcherContext(ruleAttr: string[]) /*: Function */ {
  return function endsWithMatcher(runtimeAttr: string): boolean {
    let endsWith = ruleAttr.some(e => strEndsWith(runtimeAttr, e));

    log.debug(`[endsWithMatcher] ${runtimeAttr} ends with ${ruleAttr}? ${endsWith}`);

    return endsWith;
  };
}
