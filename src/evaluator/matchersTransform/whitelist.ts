import { ISplitMatcher } from '../../dtos/types';
import { _Set } from '../../utils/lang/sets';

/**
 * Extract whitelist as a set. Used by 'WHITELIST' matcher.
 */
export function whitelistTransform(whitelistObject: ISplitMatcher['whitelistMatcherData']) {
  return new _Set(whitelistObject && whitelistObject.whitelist);
}
