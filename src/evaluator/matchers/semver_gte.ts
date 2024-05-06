import { Semver } from '../../utils/Semver';

export function greaterThanEqualToSemverMatcherContext(ruleAttr: string) {
  const ruleSemver = new Semver(ruleAttr);

  return function greaterThanEqualToSemverMatcher(runtimeAttr: string): boolean {
    const runtimeSemver = new Semver(runtimeAttr);

    const isGreaterThanEqual = runtimeSemver.compare(ruleSemver) >= 0;

    return isGreaterThanEqual;
  };
}
