import { ISplitMatcher } from '../../dtos/types';

/**
 * Extract whitelist array. Used by set and string matchers
 */
export function setTransform(whitelistObject: ISplitMatcher['whitelistMatcherData']) {
  return whitelistObject && whitelistObject.whitelist;
}
