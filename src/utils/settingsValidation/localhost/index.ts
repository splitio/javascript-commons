import { ERROR_LOCALHOST_MODULE_REQUIRED } from '../../../logger/constants';
import { ISettings, } from '../../../types';
import { LOCALHOST_MODE } from '../../constants';

/**
 * This function validates `settings.sync.localhostMode` object
 *
 * @param {any} settings config object provided by the user to initialize the sdk
 *
 * @returns {Object | undefined} valid localhost mode module, or undefined if the provided one is not provided or invalid.
 */
export function validateLocalhost(settings: ISettings) {
  const localhostMode = settings.sync.localhostMode;

  // localhostMode.type is used for internal validation. Not considered part of the public API, and might be updated eventually.
  if (settings.mode === LOCALHOST_MODE && (typeof localhostMode !== 'function' || localhostMode.type !== 'LocalhostFromObject')) {
    settings.log.error(ERROR_LOCALHOST_MODULE_REQUIRED);
    return undefined;
  }
  return localhostMode;
}
