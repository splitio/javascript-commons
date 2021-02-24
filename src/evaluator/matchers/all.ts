import { logFactory } from '../../logger/sdkLogger';
const log = logFactory('splitio-engine:matcher');

function allMatcher(runtimeAttr: string): boolean {
  log.d('[allMatcher] is always true');

  return runtimeAttr != null;
}

export default function allMatcherContext() {
  return allMatcher;
}
