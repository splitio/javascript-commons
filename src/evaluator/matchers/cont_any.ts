import { logFactory } from '../../logger/sdkLogger';
const log = logFactory('splitio-engine:matcher');
import { findIndex } from '../../utils/lang';

export default function containsAnyMatcherContext(ruleAttr: string[]) /*: Function */ {
  return function containsAnyMatcher(runtimeAttr: string[]): boolean {
    let containsAny = false;

    for (let i = 0; i < ruleAttr.length && !containsAny; i++) {
      if (findIndex(runtimeAttr, e => e === ruleAttr[i]) >= 0) containsAny = true;
    }

    log.debug(`[containsAnyMatcher] ${runtimeAttr} contains at least an element of ${ruleAttr}? ${containsAny}`);

    return containsAny;
  };
}
