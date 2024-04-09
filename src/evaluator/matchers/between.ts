import { IBetweenMatcherData } from '../../dtos/types';
import { ENGINE_MATCHER_BETWEEN } from '../../logger/constants';
import { ILogger } from '../../logger/types';

export function betweenMatcherContext(log: ILogger, ruleVO: IBetweenMatcherData) {
  return function betweenMatcher(runtimeAttr: number): boolean {

    let isBetween = runtimeAttr >= ruleVO.start && runtimeAttr <= ruleVO.end;

    log.debug(ENGINE_MATCHER_BETWEEN, [runtimeAttr, ruleVO.start, ruleVO.end, isBetween]);

    return isBetween;
  };
}
