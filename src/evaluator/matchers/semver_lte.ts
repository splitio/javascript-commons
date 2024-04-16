import { Semver } from '../../utils/Semver';

export function lessThanEqualToSemverMatcherContext(ruleAttr: string) {
  const ruleSemver = new Semver(ruleAttr);

  return function lessThanEqualToSemverMatcher(runtimeAttr: string): boolean {
    const runtimeSemver = new Semver(runtimeAttr);

    const isLessThanEqual = runtimeSemver.compare(ruleSemver) <= 0;

    return isLessThanEqual;
  };
}
