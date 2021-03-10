import { setToArray, ISet } from '../../utils/lang/sets';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';
import { DEBUG_23 } from '../../logger/codesConstants';

export default function whitelistMatcherContext(log: ILogger, ruleAttr: ISet<string>) /*: Function */ {
  return function whitelistMatcher(runtimeAttr: string): boolean {
    let isInWhitelist = ruleAttr.has(runtimeAttr);

    log.debug(DEBUG_23, [runtimeAttr, setToArray(ruleAttr).join(','), isInWhitelist]);

    return isInWhitelist;
  };
}
