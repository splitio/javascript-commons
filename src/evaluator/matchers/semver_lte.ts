import { ENGINE_MATCHER_LESS_SEMVER } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { Semver } from '../../utils/Semver';

export function lessThanEqualToSemverMatcherContext(log: ILogger, ruleAttr: string) {
  const ruleSemver = new Semver(ruleAttr);

  return function lessThanEqualToSemverMatcher(runtimeAttr: string): boolean {
    const runtimeSemver = new Semver(runtimeAttr);

    const isLessThanEqual = runtimeSemver.compare(ruleSemver) <= 0;

    log.debug(ENGINE_MATCHER_LESS_SEMVER, [runtimeAttr, ruleAttr, isLessThanEqual]);

    return isLessThanEqual;
  };
}
