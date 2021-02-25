// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';

export default function greaterThanEqualMatcherContext(log: ILogger, ruleAttr: number) /*: Function */ {
  return function greaterThanEqualMatcher(runtimeAttr: number): boolean {
    let isGreaterEqualThan = runtimeAttr >= ruleAttr;

    log.d(`[greaterThanEqualMatcher] is ${runtimeAttr} greater than ${ruleAttr}? ${isGreaterEqualThan}`);

    return isGreaterEqualThan;
  };
}
