// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';

export default function stringMatcherContext(log: ILogger, ruleAttr: string) /*: Function */ {
  return function stringMatcher(runtimeAttr: string): boolean {
    let re;

    try {
      re = new RegExp(ruleAttr);
    } catch (e) {
      log.debug(`[stringMatcher] ${ruleAttr} is an invalid regex`);

      return false;
    }

    let regexMatches = re.test(runtimeAttr);

    log.debug(`[stringMatcher] does ${runtimeAttr} matches with ${ruleAttr}? ${regexMatches ? 'yes' : 'no'}`);

    return regexMatches;
  };
}
