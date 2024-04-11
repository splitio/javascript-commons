import { ILogger } from '../../logger/types';
import { Semver } from '../../utils/Semver';

export function equalToSemverMatcherContext(log: ILogger, ruleAttr: string) {

  const ruleSemver = new Semver(ruleAttr);

  return function equalToSemverMatcher(runtimeAttr: string): boolean {
    const isEqual = ruleSemver.version === new Semver(runtimeAttr).version;

    return isEqual;
  };
}
