// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-engine:matcher');
import { ILogger } from '../../logger/types';

export default function allMatcherContext(log: ILogger) {
  return function allMatcher(runtimeAttr: string): boolean {
    log.debug('[allMatcher] is always true');

    return runtimeAttr != null;
  };
}
