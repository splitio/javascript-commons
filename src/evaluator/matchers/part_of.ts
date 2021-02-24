import { logFactory } from '../../logger/sdkLogger';
import { findIndex } from '../../utils/lang';
const log = logFactory('splitio-engine:matcher');

export default function partOfMatcherContext(ruleAttr: string[]) /*: Function */ {
  return function partOfMatcher(runtimeAttr: string[]): boolean {
    // To be part of the length should be minor or equal.
    let isPartOf = runtimeAttr.length <= ruleAttr.length;

    for (let i = 0; i < runtimeAttr.length && isPartOf; i++) {
      // If the length says is possible, we iterate until we prove otherwise or we check all elements.
      if (findIndex(ruleAttr, e => e === runtimeAttr[i]) < 0) isPartOf = false;
    }

    log.d(`[partOfMatcher] ${runtimeAttr} is part of ${ruleAttr}? ${isPartOf}`);

    return isPartOf;
  };
}
