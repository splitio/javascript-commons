import { ILogger } from '../../logger/types';
import { Semver } from '../../utils/Semver';

export function equalToSemverMatcherContext(log: ILogger, ruleAttr: string) {

  return function equalToSemverMatcher(runtimeAttr: string): boolean {
    const ruleSemver = new Semver(ruleAttr);
    const runtimeSemver = new Semver(runtimeAttr);

    const isEqual = ruleSemver.version === runtimeSemver.version;

    return isEqual;
  };
}
