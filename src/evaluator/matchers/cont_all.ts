import { findIndex } from '../../utils/lang';

export function containsAllSetMatcherContext(ruleAttr: string[]) {
  return function containsAllMatcher(runtimeAttr: string[]): boolean {
    let containsAll = true;

    if (runtimeAttr.length < ruleAttr.length) {
      containsAll = false;
    } else {
      for (let i = 0; i < ruleAttr.length && containsAll; i++) {
        if (findIndex(runtimeAttr, e => e === ruleAttr[i]) < 0)
          containsAll = false;
      }
    }

    return containsAll;
  };
}
