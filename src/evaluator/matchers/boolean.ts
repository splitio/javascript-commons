import { ENGINE_MATCHER_BOOLEAN } from '../../logger/constants';
import { ILogger } from '../../logger/types';

export function booleanMatcherContext(log: ILogger, ruleAttr: boolean) /*: Function */ {
  return function booleanMatcher(runtimeAttr: boolean): boolean {
    let booleanMatches = ruleAttr === runtimeAttr;

    log.debug(ENGINE_MATCHER_BOOLEAN, [ruleAttr, runtimeAttr]);

    return booleanMatches;
  };
}
