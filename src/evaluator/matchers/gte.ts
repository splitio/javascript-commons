export function greaterThanEqualMatcherContext(ruleAttr: number) {

  return function greaterThanEqualMatcher(runtimeAttr: number): boolean {
    const isGreaterThanEqual = runtimeAttr >= ruleAttr;

    return isGreaterThanEqual;
  };
}
