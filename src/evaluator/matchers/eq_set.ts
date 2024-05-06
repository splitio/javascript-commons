import { findIndex } from '../../utils/lang';

export function equalToSetMatcherContext(ruleAttr: string[]) {
  return function equalToSetMatcher(runtimeAttr: string[]): boolean {
    // Length being the same is the first condition.
    let isEqual = runtimeAttr.length === ruleAttr.length;

    for (let i = 0; i < runtimeAttr.length && isEqual; i++) {
      // if length is the same we check that all elements are present in the other collection.
      if (findIndex(ruleAttr, e => e === runtimeAttr[i]) < 0) isEqual = false;
    }

    return isEqual;
  };
}
