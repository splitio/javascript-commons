import { ENGINE_MATCHER_LESS } from '../../logger/constants';
import { ILogger } from '../../logger/types';

export function lessThanEqualMatcherContext(log: ILogger, ruleAttr: number) {
  return function lessThanEqualMatcher(runtimeAttr: number): boolean {
    let isLessThanEqual = runtimeAttr <= ruleAttr;

    log.debug(ENGINE_MATCHER_LESS, [runtimeAttr, ruleAttr, isLessThanEqual]);

    return isLessThanEqual;
  };
}
