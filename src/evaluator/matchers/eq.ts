import { DEBUG_12 } from '../../logger/constants';
import { ILogger } from '../../logger/types';

export default function equalToMatcherContext(log: ILogger, ruleAttr: number) /*: Function */ {
  return function equalToMatcher(runtimeAttr: number): boolean {
    let isEqual = runtimeAttr === ruleAttr;

    log.debug(DEBUG_12, [runtimeAttr, ruleAttr, isEqual]);

    return isEqual;
  };
}
