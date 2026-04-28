import { IDefinitionMatcher } from '../../dtos/types';

/**
 * Extract whitelist array.
 */
export function whitelistTransform(whitelistObject: IDefinitionMatcher['whitelistMatcherData']) {
  return whitelistObject && whitelistObject.whitelist;
}
