import { DEBUG_8 } from '../../logger/constants';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';
import { findIndex } from '../../utils/lang';

export default function containsAnyMatcherContext(log: ILogger, ruleAttr: string[]) /*: Function */ {
  return function containsAnyMatcher(runtimeAttr: string[]): boolean {
    let containsAny = false;

    for (let i = 0; i < ruleAttr.length && !containsAny; i++) {
      if (findIndex(runtimeAttr, e => e === ruleAttr[i]) >= 0) containsAny = true;
    }

    log.debug(DEBUG_8, [runtimeAttr, ruleAttr, containsAny]);

    return containsAny;
  };
}
