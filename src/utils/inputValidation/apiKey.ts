import { ERROR_API_KEY, WARN_API_KEY } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { isString } from '../lang';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('');

/** validates the given api key */
export function validateApiKey(log: ILogger, maybeApiKey: any): string | false {
  let apiKey: string | false = false;
  if (maybeApiKey == undefined) { // eslint-disable-line eqeqeq
    log.error(ERROR_API_KEY, ['you passed a null or undefined api_key']);
  } else if (isString(maybeApiKey)) {
    if (maybeApiKey.length > 0)
      apiKey = maybeApiKey;
    else
      log.error(ERROR_API_KEY, ['you passed an empty api_key']);
  } else {
    log.error(ERROR_API_KEY, ['you passed an invalid api_key']);
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
        log.warn(WARN_API_KEY, ['You already have an instance of the Split factory. Make sure you definitely want this additional instance']);
      }
    } else {
      log.warn(WARN_API_KEY, [`You already have ${usedKeysMap[apiKey]} ${usedKeysMap[apiKey] === 1 ? 'factory' : 'factories'} with this API Key`]);
      usedKeysMap[apiKey]++;
    }
  }

  return apiKey;
}

export function releaseApiKey(apiKey: string) {
  if (usedKeysMap[apiKey]) usedKeysMap[apiKey]--;
  if (usedKeysMap[apiKey] === 0) delete usedKeysMap[apiKey];
}
