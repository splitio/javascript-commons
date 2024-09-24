import { _Set } from '../../utils/lang/sets';

export function whitelistMatcherContext(ruleAttr: string[]) {
  const whitelistSet = new _Set(ruleAttr);

  return function whitelistMatcher(runtimeAttr: string): boolean {
    const isInWhitelist = whitelistSet.has(runtimeAttr);

    return isInWhitelist;
  };
}
