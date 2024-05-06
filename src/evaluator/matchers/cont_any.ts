import { findIndex } from '../../utils/lang';

export function containsAnySetMatcherContext(ruleAttr: string[]) {
  return function containsAnyMatcher(runtimeAttr: string[]): boolean {
    let containsAny = false;

    for (let i = 0; i < ruleAttr.length && !containsAny; i++) {
      if (findIndex(runtimeAttr, e => e === ruleAttr[i]) >= 0) containsAny = true;
    }

    return containsAny;
  };
}
