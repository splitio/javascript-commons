import { DEBUG_16 } from '../../logger/codesConstants';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';

export default function lessThanEqualMatcherContext(log: ILogger, ruleAttr: number) /*: function */ {
  return function lessThanEqualMatcher(runtimeAttr: number): boolean {
    let isLessEqualThan = runtimeAttr <= ruleAttr;

    log.debug(DEBUG_16, [runtimeAttr, ruleAttr, isLessEqualThan]);

    return isLessEqualThan;
  };
}
