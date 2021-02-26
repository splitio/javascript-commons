import { ILogger } from '../../logger/types';
import { isString } from '../lang';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('', {
//   // Errors on API key validation are important enough so that one day we might force logging them or throw an exception on startup.
//   displayAllErrors: true
// });

function apiKeyError(reason: string) { return `Factory instantiation: ${reason}, api_key must be a non-empty string.`; }

/** validates the given api key */
export function validateApiKey(log: ILogger, maybeApiKey: any): string | false {
  let apiKey: string | false = false;
  if (maybeApiKey == undefined) { // eslint-disable-line eqeqeq
    log.e(apiKeyError('you passed a null or undefined api_key'));
  } else if (isString(maybeApiKey)) {
    if (maybeApiKey.length > 0)
      apiKey = maybeApiKey;
    else
      log.e(apiKeyError('you passed an empty api_key'));
  } else {
    log.e(apiKeyError('you passed an invalid api_key'));
  }

  return apiKey;
}

const usedKeysMap: Record<string, number> = {};

function apiKeyWarn(reason: string) { return `Factory instantiation: ${reason}. We recommend keeping only one instance of the factory at all times (Singleton pattern) and reusing it throughout your application.`; }

/** validates the given api key and also warns if it is in use */
export function validateAndTrackApiKey(log: ILogger, maybeApiKey: any): string | false {
  const apiKey = validateApiKey(log, maybeApiKey);

  // If the apiKey is correct, we'll save it as the instance creation should work.
  if (apiKey) {
    if (!usedKeysMap[apiKey]) {
      // If this key is not present, only warning scenarios is that we have factories for other keys.
      usedKeysMap[apiKey] = 1;
      if (Object.keys(usedKeysMap).length > 1) {
        log.w(apiKeyWarn('You already have an instance of the Split factory. Make sure you definitely want this additional instance'));
      }
    } else {
      log.w(apiKeyWarn(`You already have ${usedKeysMap[apiKey]} ${usedKeysMap[apiKey] === 1 ? 'factory' : 'factories'} with this API Key`));
      usedKeysMap[apiKey]++;
    }
  }

  return apiKey;
}

export function releaseApiKey(apiKey: string) {
  if (usedKeysMap[apiKey]) usedKeysMap[apiKey]--;
  if (usedKeysMap[apiKey] === 0) delete usedKeysMap[apiKey];
}
