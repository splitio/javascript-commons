import { logFactory } from '../../logger/sdkLogger';
const log = logFactory('splitio-engine:matcher');

export default function equalToMatcherContext(ruleAttr: number) /*: Function */ {
  return function equalToMatcher(runtimeAttr: number): boolean {
    let isEqual = runtimeAttr === ruleAttr;

    log.d(`[equalToMatcher] is ${runtimeAttr} equal to ${ruleAttr}? ${isEqual}`);

    return isEqual;
  };
}
