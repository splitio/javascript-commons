import { IWhitelistMatcherData } from '../../dtos/types';
import { _Set } from '../../utils/lang/sets';

/**
 * Extract whitelist as a set. Used by 'WHITELIST' matcher.
 */
export function whitelistTransform(whitelistObject: IWhitelistMatcherData) {
  return new _Set(whitelistObject.whitelist);
}
