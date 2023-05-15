import { ERROR_EMPTY_ARRAY } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { uniq } from '../lang';
import { validateSplit } from './split';

export function validateSplits(log: ILogger, maybeSplits: any, method: string, listName = 'feature flag names', item = 'feature flag name'): string[] | false {
  if (Array.isArray(maybeSplits) && maybeSplits.length > 0) {
    let validatedArray: string[] = [];
    // Remove invalid values
    maybeSplits.forEach(maybeSplit => {
      const splitName = validateSplit(log, maybeSplit, method, item);
      if (splitName) validatedArray.push(splitName);
    });

    // Strip off duplicated values if we have valid split names then return
    if (validatedArray.length) return uniq(validatedArray);
  }

  log.error(ERROR_EMPTY_ARRAY, [method, listName]);
  return false;
}
