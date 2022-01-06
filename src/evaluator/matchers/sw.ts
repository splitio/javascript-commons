import { ENGINE_MATCHER_STARTS_WITH } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { startsWith } from '../../utils/lang';

export function startsWithMatcherContext(log: ILogger, ruleAttr: string[]) /*: Function */ {
  return function startsWithMatcher(runtimeAttr: string): boolean {
    let matches = ruleAttr.some(e => startsWith(runtimeAttr, e));

    log.debug(ENGINE_MATCHER_STARTS_WITH, [runtimeAttr, ruleAttr, matches]);

    return matches;
  };
}
