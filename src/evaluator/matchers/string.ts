import { ENGINE_MATCHER_STRING } from '../../logger/constants';
import { ILogger } from '../../logger/types';

export function stringMatcherContext(log: ILogger, ruleAttr: string) {
  return function stringMatcher(runtimeAttr: string): boolean {
    const regex = new RegExp(ruleAttr);

    const regexMatches = regex.test(runtimeAttr);

    log.debug(ENGINE_MATCHER_STRING, [runtimeAttr, ruleAttr, regexMatches ? 'yes' : 'no']);

    return regexMatches;
  };
}
