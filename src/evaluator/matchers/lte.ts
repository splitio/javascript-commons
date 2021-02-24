import { logFactory } from '../../logger/sdkLogger';
const log = logFactory('splitio-engine:matcher');

export default function lessThanEqualMatcherContext(ruleAttr: number) /*: function */ {
  return function lessThanEqualMatcher(runtimeAttr: number): boolean {
    let isLessEqualThan = runtimeAttr <= ruleAttr;

    log.d(`[lessThanEqualMatcher] is ${runtimeAttr} less than ${ruleAttr}? ${isLessEqualThan}`);

    return isLessEqualThan;
  };
}
