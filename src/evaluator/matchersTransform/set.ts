import { IWhitelistMatcherData } from '../../dtos/types';

/**
 * Extract whitelist array. Used by set and string matchers
 */
export default function transform(whitelistObject: IWhitelistMatcherData) {
  return whitelistObject.whitelist;
}
