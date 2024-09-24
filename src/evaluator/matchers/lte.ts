export function lessThanEqualMatcherContext(ruleAttr: number) {

  return function lessThanEqualMatcher(runtimeAttr: number): boolean {
    const isLessThanEqual = runtimeAttr <= ruleAttr;

    return isLessThanEqual;
  };
}
