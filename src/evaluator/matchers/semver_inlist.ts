import { _Set } from '../../utils/lang/sets';
import { Semver } from '../../utils/Semver';

export function inListSemverMatcherContext(ruleAttr: string[]) {
  // @TODO move eventually to `matchersTransform` and validate for all matchers
  if (!ruleAttr || ruleAttr.length === 0) throw new Error('whitelistMatcherData is required for IN_LIST_SEMVER matcher type');

  const listOfSemvers = new _Set(ruleAttr.map((version) => new Semver(version).version));

  return function inListSemverMatcher(runtimeAttr: string): boolean {
    const runtimeSemver = new Semver(runtimeAttr).version;

    const isInList = listOfSemvers.has(runtimeSemver);

    return isInList;
  };
}
