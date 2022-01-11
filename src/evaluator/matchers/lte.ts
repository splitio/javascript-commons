import { ENGINE_MATCHER_LESS } from '../../logger/constants';
import { ILogger } from '../../logger/types';

export function lessThanEqualMatcherContext(log: ILogger, ruleAttr: number) /*: function */ {
  return function lessThanEqualMatcher(runtimeAttr: number): boolean {
    let isLessEqualThan = runtimeAttr <= ruleAttr;

    log.debug(ENGINE_MATCHER_LESS, [runtimeAttr, ruleAttr, isLessEqualThan]);

    return isLessEqualThan;
  };
}
