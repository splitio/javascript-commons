import { setToArray, ISet } from '../../utils/lang/sets';
import { logFactory } from '../../logger/sdkLogger';
const log = logFactory('splitio-engine:matcher');

export default function whitelistMatcherContext(ruleAttr: ISet<string>) /*: Function */ {
  return function whitelistMatcher(runtimeAttr: string): boolean {
    let isInWhitelist = ruleAttr.has(runtimeAttr);

    log.debug(`[whitelistMatcher] evaluated ${runtimeAttr} in [${setToArray(ruleAttr).join(',')}] => ${isInWhitelist}`);

    return isInWhitelist;
  };
}
