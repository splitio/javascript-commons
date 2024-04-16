import { ISplitMatcher } from '../../dtos/types';

/**
 * Extract whitelist as a set. Used by 'WHITELIST' matcher.
 */
export function whitelistTransform(whitelistObject: ISplitMatcher['whitelistMatcherData']) {
  return whitelistObject && whitelistObject.whitelist;
}
