import { setToArray, ISet, _Set } from '../../utils/lang/sets';
import { ILogger } from '../../logger/types';
import { Semver } from '../../utils/Semver';

export function inListSemverMatcherContext(log: ILogger, ruleAttr: ISet<string>) {

  const listOfSemvers = new _Set(setToArray(ruleAttr).map((version) => new Semver(version).version));

  return function inListSemverMatcher(runtimeAttr: string): boolean {
    const runtimeSemver = new Semver(runtimeAttr).version;
    const isInList = listOfSemvers.has(runtimeSemver);

    return isInList;
  };
}
