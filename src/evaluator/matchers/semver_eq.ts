import { ENGINE_MATCHER_EQUAL_SEMVER } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { Semver } from '../../utils/Semver';

export function equalToSemverMatcherContext(log: ILogger, ruleAttr: string) {
  const ruleSemver = new Semver(ruleAttr);

  return function equalToSemverMatcher(runtimeAttr: string): boolean {
    const runtimeSemver = new Semver(runtimeAttr);

    const isEqual = ruleSemver.version === runtimeSemver.version;

    log.debug(ENGINE_MATCHER_EQUAL_SEMVER, [runtimeAttr, ruleAttr, isEqual]);

    return isEqual;
  };
}
