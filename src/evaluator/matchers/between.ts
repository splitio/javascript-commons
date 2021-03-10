import { IBetweenMatcherData } from '../../dtos/types';
import { DEBUG_5 } from '../../logger/codesConstants';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';

export default function betweenMatcherContext(log: ILogger, ruleVO: IBetweenMatcherData) /*: Function */ {
  return function betweenMatcher(runtimeAttr: number): boolean {

    let isBetween = runtimeAttr >= ruleVO.start && runtimeAttr <= ruleVO.end;

    log.debug(DEBUG_5, [runtimeAttr, ruleVO.start, ruleVO.end, isBetween]);

    return isBetween;
  };
}
