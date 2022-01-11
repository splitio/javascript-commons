import { setToArray, ISet } from '../../utils/lang/sets';
import { ILogger } from '../../logger/types';
import { ENGINE_MATCHER_WHITELIST } from '../../logger/constants';

export function whitelistMatcherContext(log: ILogger, ruleAttr: ISet<string>) /*: Function */ {
  return function whitelistMatcher(runtimeAttr: string): boolean {
    let isInWhitelist = ruleAttr.has(runtimeAttr);

    log.debug(ENGINE_MATCHER_WHITELIST, [runtimeAttr, setToArray(ruleAttr).join(','), isInWhitelist]);

    return isInWhitelist;
  };
}
