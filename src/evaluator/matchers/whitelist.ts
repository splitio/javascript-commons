export function whitelistMatcherContext(ruleAttr?: string[] | null) {
  const whitelistSet = new Set(ruleAttr || []);

  return function whitelistMatcher(runtimeAttr: string): boolean {
    const isInWhitelist = whitelistSet.has(runtimeAttr);

    return isInWhitelist;
  };
}
