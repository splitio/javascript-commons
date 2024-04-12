import { ILogger } from '../../logger/types';
import { Semver } from '../../utils/Semver';

export function lessThanEqualToSemverMatcherContext(log: ILogger, ruleAttr: string) {

  const ruleSemver = new Semver(ruleAttr);

  return function lessThanEqualToSemverMatcher(runtimeAttr: string): boolean {
    let isLessThenEqual = new Semver(runtimeAttr).compare(ruleSemver) <= 0;

    return isLessThenEqual;
  };
}
