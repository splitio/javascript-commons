import { ENGINE_MATCHER_CONTAINS_ANY } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { findIndex } from '../../utils/lang';

export function containsAnySetMatcherContext(log: ILogger, ruleAttr: string[]) /*: Function */ {
  return function containsAnyMatcher(runtimeAttr: string[]): boolean {
    let containsAny = false;

    for (let i = 0; i < ruleAttr.length && !containsAny; i++) {
      if (findIndex(runtimeAttr, e => e === ruleAttr[i]) >= 0) containsAny = true;
    }

    log.debug(ENGINE_MATCHER_CONTAINS_ANY, [runtimeAttr, ruleAttr, containsAny]);

    return containsAny;
  };
}
