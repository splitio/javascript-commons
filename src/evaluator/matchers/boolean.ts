import { logFactory } from '../../logger/sdkLogger';
const log = logFactory('splitio-engine:matcher');

export default function booleanMatcherContext(ruleAttr: boolean) /*: Function */ {
  return function booleanMatcher(runtimeAttr: boolean): boolean {
    let booleanMatches = ruleAttr === runtimeAttr;

    log.debug(`[booleanMatcher] ${ruleAttr} === ${runtimeAttr}`);

    return booleanMatches;
  };
}
