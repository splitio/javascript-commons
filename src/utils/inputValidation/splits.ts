import { uniq } from '../lang';
import { logFactory } from '../../logger/sdkLogger';
import { validateSplit } from './split';
const log = logFactory('');

export function validateSplits(maybeSplits: any, method: string, listName = 'split_names', item = 'split name'): string[] | false {
  if (Array.isArray(maybeSplits) && maybeSplits.length > 0) {
    let validatedArray: string[] = [];
    // Remove invalid values
    maybeSplits.forEach(maybeSplit => {
      const splitName = validateSplit(maybeSplit, method, item);
      if (splitName) validatedArray.push(splitName);
    });

    // Strip off duplicated values if we have valid split names then return
    if (validatedArray.length) return uniq(validatedArray);
  }

  log.e(`${method}: ${listName} must be a non-empty array.`);
  return false;
}
