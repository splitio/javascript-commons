import { IWhitelistMatcherData } from '../../dtos/types';

/**
 * Extract whitelist array. Used by set and string matchers
 */
export function setTransform(whitelistObject: IWhitelistMatcherData) {
  return whitelistObject.whitelist;
}
