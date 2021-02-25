// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';

export default function lessThanEqualMatcherContext(log: ILogger, ruleAttr: number) /*: function */ {
  return function lessThanEqualMatcher(runtimeAttr: number): boolean {
    let isLessEqualThan = runtimeAttr <= ruleAttr;

    log.d(`[lessThanEqualMatcher] is ${runtimeAttr} less than ${ruleAttr}? ${isLessEqualThan}`);

    return isLessEqualThan;
  };
}
