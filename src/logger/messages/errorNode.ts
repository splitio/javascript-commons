import { ERROR_1, ERROR_API_KEY_INVALID, ERROR_6, SETTINGS_LB, CLEANUP_LB, SYNC_OFFLINE_LB } from '../constants';

export const codesErrorNode: [number, string][] = [
  [ERROR_1, CLEANUP_LB + 'Error with Split graceful shutdown: %s'],
  [ERROR_6, SYNC_OFFLINE_LB + 'Ignoring entry on YAML since the format is incorrect.'],
  [ERROR_API_KEY_INVALID, SETTINGS_LB+': you passed a Client-side type authorizationKey, please grab an Api Key from the Split web console that is of type Server-side.'],
];
