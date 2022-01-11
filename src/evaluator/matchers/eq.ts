import { ENGINE_MATCHER_EQUAL } from '../../logger/constants';
import { ILogger } from '../../logger/types';

export function equalToMatcherContext(log: ILogger, ruleAttr: number) /*: Function */ {
  return function equalToMatcher(runtimeAttr: number): boolean {
    let isEqual = runtimeAttr === ruleAttr;

    log.debug(ENGINE_MATCHER_EQUAL, [runtimeAttr, ruleAttr, isEqual]);

    return isEqual;
  };
}
