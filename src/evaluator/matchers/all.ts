export function allMatcherContext() {

  return function allMatcher(runtimeAttr: string): boolean {
    return runtimeAttr != null;
  };
}
