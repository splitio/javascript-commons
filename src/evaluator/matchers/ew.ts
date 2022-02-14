import { ENGINE_MATCHER_ENDS_WITH } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { endsWith } from '../../utils/lang';

export function endsWithMatcherContext(log: ILogger, ruleAttr: string[]) /*: Function */ {
  return function endsWithMatcher(runtimeAttr: string): boolean {
    let strEndsWith = ruleAttr.some(e => endsWith(runtimeAttr, e));

    log.debug(ENGINE_MATCHER_ENDS_WITH, [runtimeAttr, ruleAttr, strEndsWith]);

    return strEndsWith;
  };
}
