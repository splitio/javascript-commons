import { _Set } from '../../utils/lang/sets';
import { ILogger } from '../../logger/types';
import { ENGINE_MATCHER_WHITELIST } from '../../logger/constants';

export function whitelistMatcherContext(log: ILogger, ruleAttr: string[]) {
  const whitelistSet = new _Set(ruleAttr);

  return function whitelistMatcher(runtimeAttr: string): boolean {
    const isInWhitelist = whitelistSet.has(runtimeAttr);

    log.debug(ENGINE_MATCHER_WHITELIST, [runtimeAttr, ruleAttr.join(','), isInWhitelist]);

    return isInWhitelist;
  };
}
