import { DEBUG_6 } from '../../logger/constants';
import { ILogger } from '../../logger/types';

export default function booleanMatcherContext(log: ILogger, ruleAttr: boolean) /*: Function */ {
  return function booleanMatcher(runtimeAttr: boolean): boolean {
    let booleanMatches = ruleAttr === runtimeAttr;

    log.debug(DEBUG_6, [ruleAttr, runtimeAttr]);

    return booleanMatches;
  };
}
