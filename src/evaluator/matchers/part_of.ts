import { findIndex } from '../../utils/lang';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';
import { DEBUG_17 } from '../../logger/codesConstants';

export default function partOfMatcherContext(log: ILogger, ruleAttr: string[]) /*: Function */ {
  return function partOfMatcher(runtimeAttr: string[]): boolean {
    // To be part of the length should be minor or equal.
    let isPartOf = runtimeAttr.length <= ruleAttr.length;

    for (let i = 0; i < runtimeAttr.length && isPartOf; i++) {
      // If the length says is possible, we iterate until we prove otherwise or we check all elements.
      if (findIndex(ruleAttr, e => e === runtimeAttr[i]) < 0) isPartOf = false;
    }

    log.debug(DEBUG_17, [runtimeAttr, ruleAttr, isPartOf]);

    return isPartOf;
  };
}
