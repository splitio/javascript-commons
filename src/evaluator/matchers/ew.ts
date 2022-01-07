import { ENGINE_MATCHER_ENDS_WITH } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { endsWith as strEndsWith } from '../../utils/lang';

export function endsWithMatcherContext(log: ILogger, ruleAttr: string[]) /*: Function */ {
  return function endsWithMatcher(runtimeAttr: string): boolean {
    let endsWith = ruleAttr.some(e => strEndsWith(runtimeAttr, e));

    log.debug(ENGINE_MATCHER_ENDS_WITH, [runtimeAttr, ruleAttr, endsWith]);

    return endsWith;
  };
}
