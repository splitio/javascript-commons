import { DEBUG_21, DEBUG_20 } from '../../logger/constants';
import { ILogger } from '../../logger/types';

export default function stringMatcherContext(log: ILogger, ruleAttr: string) /*: Function */ {
  return function stringMatcher(runtimeAttr: string): boolean {
    let re;

    try {
      re = new RegExp(ruleAttr);
    } catch (e) {
      log.debug(DEBUG_21, [ruleAttr]);

      return false;
    }

    let regexMatches = re.test(runtimeAttr);

    log.debug(DEBUG_20, [runtimeAttr, ruleAttr, regexMatches ? 'yes' : 'no']);

    return regexMatches;
  };
}
