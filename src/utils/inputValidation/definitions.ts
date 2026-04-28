import { ERROR_EMPTY_ARRAY } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { uniq } from '../lang';
import { validateDefinition } from './definition';

export function validateDefinitions(log: ILogger, maybeDefinitions: any, method: string, listName = 'feature flag names', item = 'feature flag name'): string[] | false {
  if (Array.isArray(maybeDefinitions) && maybeDefinitions.length > 0) {
    let validatedArray: string[] = [];
    // Remove invalid values
    maybeDefinitions.forEach(maybeDefinition => {
      const definitionName = validateDefinition(log, maybeDefinition, method, item);
      if (definitionName) validatedArray.push(definitionName);
    });

    // Strip off duplicated values if we have valid definition names then return
    if (validatedArray.length) return uniq(validatedArray);
  }

  log.error(ERROR_EMPTY_ARRAY, [method, listName]);
  return false;
}
