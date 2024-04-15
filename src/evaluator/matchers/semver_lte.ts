import { ILogger } from '../../logger/types';
import { Semver } from '../../utils/Semver';

export function lessThanEqualToSemverMatcherContext(log: ILogger, ruleAttr: string) {
  const ruleSemver = new Semver(ruleAttr);

  return function lessThanEqualToSemverMatcher(runtimeAttr: string): boolean {
    const runtimeSemver = new Semver(runtimeAttr);

    const isLessThenEqual = runtimeSemver.compare(ruleSemver) <= 0;

    return isLessThenEqual;
  };
}
