import { IBetweenMatcherData } from '../../dtos/types';
import { logFactory } from '../../logger/sdkLogger';
const log = logFactory('splitio-engine:matcher');

export default function betweenMatcherContext(ruleVO: IBetweenMatcherData) /*: Function */ {
  return function betweenMatcher(runtimeAttr: number): boolean {

    let isBetween = runtimeAttr >= ruleVO.start && runtimeAttr <= ruleVO.end;

    log.d(`[betweenMatcher] is ${runtimeAttr} between ${ruleVO.start} and ${ruleVO.end}? ${isBetween}`);

    return isBetween;
  };
}
