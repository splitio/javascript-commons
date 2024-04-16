export function equalToMatcherContext(ruleAttr: number) {

  return function equalToMatcher(runtimeAttr: number): boolean {
    const isEqual = runtimeAttr === ruleAttr;

    return isEqual;
  };
}
