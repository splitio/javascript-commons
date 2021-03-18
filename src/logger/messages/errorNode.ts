import { ERROR_1, ERROR_API_KEY_INVALID, ERROR_6, SETTINGS_LB } from '../constants';

export const codesErrorNode: [number, string][] = [
  [ERROR_1, 'splitio-client:cleanup => Error with Split graceful shutdown: %s'],
  [ERROR_6, 'splitio-offline:splits-fetcher => Ignoring entry on YAML since the format is incorrect.'],
  // initialization / settings validation
  [ERROR_API_KEY_INVALID, SETTINGS_LB+': you passed a Client-side type authorizationKey, please grab an Api Key from the Split web console that is of type Server-side.'],
];
