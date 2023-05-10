import { ERROR_NULL, ERROR_EMPTY, ERROR_INVALID, WARN_SDK_KEY, LOG_PREFIX_INSTANTIATION } from '../../logger/constants';
import { ILogger } from '../../logger/types';
import { isString } from '../lang';

const item = 'sdk_key';

// @TODO replace ApiKey with SdkKey in function names
/** validates the given SDK key */
export function validateApiKey(log: ILogger, maybeSdkKey: any): string | false {
  let sdkKey: string | false = false;
  if (maybeSdkKey == undefined) { // eslint-disable-line eqeqeq
    log.error(ERROR_NULL, [LOG_PREFIX_INSTANTIATION, item]);
  } else if (isString(maybeSdkKey)) {
    if (maybeSdkKey.length > 0)
      sdkKey = maybeSdkKey;
    else
      log.error(ERROR_EMPTY, [LOG_PREFIX_INSTANTIATION, item]);
  } else {
    log.error(ERROR_INVALID, [LOG_PREFIX_INSTANTIATION, item]);
  }

  return sdkKey;
}

// Exported for telemetry
export const usedKeysMap: Record<string, number> = {};

/** validates the given SDK key and also warns if it is in use */
export function validateAndTrackApiKey(log: ILogger, maybeSdkKey: any): string | false {
  const sdkKey = validateApiKey(log, maybeSdkKey);

  // If sdkKey is correct, we'll save it as the instance creation should work.
  if (sdkKey) {
    if (!usedKeysMap[sdkKey]) {
      // If this key is not present, only warning scenarios is that we have factories for other keys.
      usedKeysMap[sdkKey] = 1;
      if (Object.keys(usedKeysMap).length > 1) {
        log.warn(WARN_SDK_KEY, ['an instance of the Split factory']);
      }
    } else {
      log.warn(WARN_SDK_KEY, [`${usedKeysMap[sdkKey]} factory/ies with this SDK Key`]);
      usedKeysMap[sdkKey]++;
    }
  }

  return sdkKey;
}

export function releaseApiKey(sdkKey: string) {
  if (usedKeysMap[sdkKey]) usedKeysMap[sdkKey]--;
  if (usedKeysMap[sdkKey] === 0) delete usedKeysMap[sdkKey];
}
