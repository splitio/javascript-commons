import { ENGINE_MATCHER_GREATER } from '../../logger/constants';
import { ILogger } from '../../logger/types';

export function greaterThanEqualMatcherContext(log: ILogger, ruleAttr: number) /*: Function */ {
  return function greaterThanEqualMatcher(runtimeAttr: number): boolean {
    let isGreaterEqualThan = runtimeAttr >= ruleAttr;

    log.debug(ENGINE_MATCHER_GREATER, [runtimeAttr, ruleAttr, isGreaterEqualThan]);

    return isGreaterEqualThan;
  };
}
