import { IBetweenMatcherData } from '../../dtos/types';

export function betweenMatcherContext(ruleVO: IBetweenMatcherData) {

  return function betweenMatcher(runtimeAttr: number): boolean {
    const isBetween = runtimeAttr >= ruleVO.start && runtimeAttr <= ruleVO.end;

    return isBetween;
  };
}
