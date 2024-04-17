import { ISplitMatcher } from '../../dtos/types';

/**
 * Extract whitelist array.
 */
export function whitelistTransform(whitelistObject: ISplitMatcher['whitelistMatcherData']) {
  return whitelistObject && whitelistObject.whitelist;
}
