import { setToArray, ISet, _Set } from '../../utils/lang/sets';
import { ILogger } from '../../logger/types';
import { Semver } from '../../utils/Semver';
import { ENGINE_MATCHER_IN_LIST_SEMVER } from '../../logger/constants';

export function inListSemverMatcherContext(log: ILogger, ruleAttr: ISet<string>) {
  // @TODO move eventually to `matchersTransform` and validate for all matchers
  if (!ruleAttr || ruleAttr.size === 0) throw new Error('whitelistMatcherData is required for IN_LIST_SEMVER matcher type');

  const listOfSemvers = new _Set(setToArray(ruleAttr).map((version) => new Semver(version).version));

  return function inListSemverMatcher(runtimeAttr: string): boolean {
    const runtimeSemver = new Semver(runtimeAttr).version;

    const isInList = listOfSemvers.has(runtimeSemver);

    log.debug(ENGINE_MATCHER_IN_LIST_SEMVER, [runtimeAttr, setToArray(ruleAttr).join(','), isInList]);

    return isInList;
  };
}
