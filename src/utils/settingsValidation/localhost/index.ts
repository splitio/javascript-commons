import { ERROR_LOCALHOST_MODULE_REQUIRED } from '../../../logger/constants';
import { ISettings, } from '../../../types';
import { LOCALHOST_MODE } from '../../constants';

/**
 * This function validates `settings.storage` object
 *
 * @param {any} settings config object provided by the user to initialize the sdk
 *
 * @returns {Object} valid storage factory. It might be the default `InMemoryStorageCSFactory` if the provided storage is invalid.
 */
export function validateLocalhost(settings: ISettings) {
  const localhostMode = settings.sync.localhostMode;

  // localhostMode.type is used for internal validation. Not considered part of the public API, and might be updated eventually.
  if (settings.mode === LOCALHOST_MODE && (typeof localhostMode !== 'function' || localhostMode.type !== 'fromObject')) {
    settings.log.error(ERROR_LOCALHOST_MODULE_REQUIRED);
  }
  return localhostMode;
}
