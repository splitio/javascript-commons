import { ILogger } from '../../logger/types';
import { Semver } from '../../utils/Semver';

export function greaterThanEqualToSemverMatcherContext(log: ILogger, ruleAttr: string) {

  const ruleSemver = new Semver(ruleAttr);

  return function greaterThanEqualToSemverMatcher(runtimeAttr: string): boolean {
    let isGreaterThanEqual = new Semver(runtimeAttr).compare(ruleSemver) >= 0;

    return isGreaterThanEqual;
  };
}
