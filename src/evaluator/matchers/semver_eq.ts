import { Semver } from '../../utils/Semver';

export function equalToSemverMatcherContext(ruleAttr: string) {
  const ruleSemver = new Semver(ruleAttr);

  return function equalToSemverMatcher(runtimeAttr: string): boolean {
    const runtimeSemver = new Semver(runtimeAttr);

    const isEqual = ruleSemver.version === runtimeSemver.version;

    return isEqual;
  };
}
