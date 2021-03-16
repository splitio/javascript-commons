import { DEBUG_4 } from '../../logger/constants';
import { ILogger } from '../../logger/types';

export default function allMatcherContext(log: ILogger) {
  return function allMatcher(runtimeAttr: string): boolean {
    log.debug(DEBUG_4);

    return runtimeAttr != null;
  };
}
