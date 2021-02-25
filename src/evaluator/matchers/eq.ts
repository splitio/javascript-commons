// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';

export default function equalToMatcherContext(log: ILogger, ruleAttr: number) /*: Function */ {
  return function equalToMatcher(runtimeAttr: number): boolean {
    let isEqual = runtimeAttr === ruleAttr;

    log.d(`[equalToMatcher] is ${runtimeAttr} equal to ${ruleAttr}? ${isEqual}`);

    return isEqual;
  };
}
