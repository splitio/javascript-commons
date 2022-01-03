import { ENGINE_MATCHER_STRING_INVALID, ENGINE_MATCHER_STRING } from '../../logger/constants';
import { ILogger } from '../../logger/types';

export function stringMatcherContext(log: ILogger, ruleAttr: string) /*: Function */ {
  return function stringMatcher(runtimeAttr: string): boolean {
    let re;

    try {
      re = new RegExp(ruleAttr);
    } catch (e) {
      log.debug(ENGINE_MATCHER_STRING_INVALID, [ruleAttr]);

      return false;
    }

    let regexMatches = re.test(runtimeAttr);

    log.debug(ENGINE_MATCHER_STRING, [runtimeAttr, ruleAttr, regexMatches ? 'yes' : 'no']);

    return regexMatches;
  };
}
