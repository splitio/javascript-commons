import { logFactory } from '../../logger/sdkLogger';
const log = logFactory('splitio-engine:matcher');
import { findIndex } from '../../utils/lang';

export default function containsAllMatcherContext(ruleAttr: string[]) /*: Function */ {
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

    log.debug(`[containsAllMatcher] ${runtimeAttr} contains all elements of ${ruleAttr}? ${containsAll}`);

    return containsAll;
  };
}
