import { IBetweenStringMatcherData } from '../../dtos/types';
import { ENGINE_MATCHER_BETWEEN_SEMVER } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { Semver } from '../../utils/Semver';

export function betweenSemverMatcherContext(log: ILogger, ruleAttr: IBetweenStringMatcherData) {
  const startSemver = new Semver(ruleAttr.start);
  const endSemver = new Semver(ruleAttr.end);

  return function betweenSemverMatcher(runtimeAttr: string): boolean {
    const runtimeSemver = new Semver(runtimeAttr);

    const isBetween = startSemver.compare(runtimeSemver) <= 0 && endSemver.compare(runtimeSemver) >= 0;

    log.debug(ENGINE_MATCHER_BETWEEN_SEMVER, [runtimeAttr, ruleAttr.start, ruleAttr.end, isBetween]);

    return isBetween;
  };
}
