import { ILogger } from '../../../logger/types';
import { SDKMode, } from '../../../types';
import { LocalhostFromObject } from '../../../sync/offline/LocalhostFromObject';
import { validateLocalhost } from './pluggable';

/**
 * This function validates `settings.sync.localhostMode` object
 *
 * @param {any} settings config object provided by the user to initialize the sdk
 *
 * @returns {Object} provided localhost mode module at `settings.sync.localhostMode` if valid, or a default LocalhostFromObject instance if not provided or invalid
 */
export function validateLocalhostWithDefault(settings: { log: ILogger, sync: { localhostMode?: any }, mode: SDKMode }) {
  if (!settings.sync.localhostMode) return LocalhostFromObject();
  return validateLocalhost(settings) || LocalhostFromObject();
}
