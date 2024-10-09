export function whitelistMatcherContext(ruleAttr: string[]) {
  const whitelistSet = new Set(ruleAttr);

  return function whitelistMatcher(runtimeAttr: string): boolean {
    const isInWhitelist = whitelistSet.has(runtimeAttr);

    return isInWhitelist;
  };
}
