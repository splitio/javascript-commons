export function booleanMatcherContext(ruleAttr: boolean) {

  return function booleanMatcher(runtimeAttr: boolean): boolean {
    const booleanMatches = ruleAttr === runtimeAttr;

    return booleanMatches;
  };
}
