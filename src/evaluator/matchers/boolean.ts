// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';

export default function booleanMatcherContext(log: ILogger, ruleAttr: boolean) /*: Function */ {
  return function booleanMatcher(runtimeAttr: boolean): boolean {
    let booleanMatches = ruleAttr === runtimeAttr;

    log.d(`[booleanMatcher] ${ruleAttr} === ${runtimeAttr}`);

    return booleanMatches;
  };
}
