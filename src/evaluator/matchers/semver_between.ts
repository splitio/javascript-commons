import { IBetweenStringMatcherData } from '../../dtos/types';
import { Semver } from '../../utils/Semver';

export function betweenSemverMatcherContext(ruleAttr: IBetweenStringMatcherData) {
  const startSemver = new Semver(ruleAttr.start);
  const endSemver = new Semver(ruleAttr.end);

  return function betweenSemverMatcher(runtimeAttr: string): boolean {
    const runtimeSemver = new Semver(runtimeAttr);

    const isBetween = startSemver.compare(runtimeSemver) <= 0 && endSemver.compare(runtimeSemver) >= 0;

    return isBetween;
  };
}
