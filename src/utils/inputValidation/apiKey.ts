import { ERROR_NULL, ERROR_EMPTY, ERROR_INVALID, WARN_API_KEY, LOG_PREFIX_INSTANTIATION } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { isString } from '../lang';

const item = 'api_key';

/** validates the given api key */
export function validateApiKey(log: ILogger, maybeApiKey: any): string | false {
  let apiKey: string | false = false;
  if (maybeApiKey == undefined) { // eslint-disable-line eqeqeq
    log.error(ERROR_NULL, [LOG_PREFIX_INSTANTIATION, item]);
  } else if (isString(maybeApiKey)) {
    if (maybeApiKey.length > 0)
      apiKey = maybeApiKey;
    else
      log.error(ERROR_EMPTY, [LOG_PREFIX_INSTANTIATION, item]);
  } else {
    log.error(ERROR_INVALID, [LOG_PREFIX_INSTANTIATION, item]);
  }

  return apiKey;
}

const usedKeysMap: Record<string, number> = {};

/** validates the given api key and also warns if it is in use */
export function validateAndTrackApiKey(log: ILogger, maybeApiKey: any): string | false {
  const apiKey = validateApiKey(log, maybeApiKey);

  // If the apiKey is correct, we'll save it as the instance creation should work.
  if (apiKey) {
    if (!usedKeysMap[apiKey]) {
      // If this key is not present, only warning scenarios is that we have factories for other keys.
      usedKeysMap[apiKey] = 1;
      if (Object.keys(usedKeysMap).length > 1) {
        log.warn(WARN_API_KEY, ['an instance of the Split factory']);
      }
    } else {
      log.warn(WARN_API_KEY, [`${usedKeysMap[apiKey]} factory/ies with this API Key`]);
      usedKeysMap[apiKey]++;
    }
  }

  return apiKey;
}

export function releaseApiKey(apiKey: string) {
  if (usedKeysMap[apiKey]) usedKeysMap[apiKey]--;
  if (usedKeysMap[apiKey] === 0) delete usedKeysMap[apiKey];
}
