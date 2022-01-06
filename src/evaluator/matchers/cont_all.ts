import { ENGINE_MATCHER_CONTAINS_ALL } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { findIndex } from '../../utils/lang';

export function containsAllSetMatcherContext(log: ILogger, ruleAttr: string[]) /*: Function */ {
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

    log.debug(ENGINE_MATCHER_CONTAINS_ALL, [runtimeAttr, ruleAttr, containsAll]);

    return containsAll;
  };
}
