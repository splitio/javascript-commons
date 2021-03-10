import { DEBUG_7 } from '../../logger/codesConstants';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';
import { findIndex } from '../../utils/lang';

export default function containsAllMatcherContext(log: ILogger, ruleAttr: string[]) /*: Function */ {
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

    log.debug(DEBUG_7, [runtimeAttr, ruleAttr, containsAll]);

    return containsAll;
  };
}
