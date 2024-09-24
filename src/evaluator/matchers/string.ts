export function stringMatcherContext(ruleAttr: string) {
  const regex = new RegExp(ruleAttr);

  return function stringMatcher(runtimeAttr: string): boolean {
    const regexMatches = regex.test(runtimeAttr);

    return regexMatches;
  };
}
