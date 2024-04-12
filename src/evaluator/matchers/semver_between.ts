import { IBetweenStringMatcherData } from '../../dtos/types';
import { ILogger } from '../../logger/types';
import { Semver } from '../../utils/Semver';

export function betweenSemverMatcherContext(log: ILogger, ruleAttr: IBetweenStringMatcherData) {

  const startSemver = new Semver(ruleAttr.start);
  const endSemver = new Semver(ruleAttr.end);

  return function betweenSemverMatcher(key: string): boolean {

    const runtimeSemver = new Semver(key);

    let isBetween = startSemver.compare(runtimeSemver) <= 0 && endSemver.compare(runtimeSemver) >= 0;

    return isBetween;
  };
}
