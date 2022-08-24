import { ENGINE_MATCHER_ALL } from '../../logger/constants';
import { ILogger } from '../../types';

export function allMatcherContext(log: ILogger) {
  return function allMatcher(runtimeAttr: string): boolean {
    log.debug(ENGINE_MATCHER_ALL);

    return runtimeAttr != null;
  };
}
