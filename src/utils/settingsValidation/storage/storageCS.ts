import { InMemoryStorageCSFactory } from '../../../storages/inMemory/InMemoryStorageCS';
import { ISettings } from '../../../types';
import { ILogger } from '../../../logger/types';
import { WARN_25 } from '../../../logger/constants';
// import { logFactory } from '../../../logger/sdkLogger';
// const log = logFactory('splitio-settings');

/**
 * This function validates `settings.storage` object
 *
 * @param {any} settings config object provided by the user to initialize the sdk
 *
 * @returns {Object} valid storage factory. It might be the default `InMemoryStorageCSFactory` if the provided storage is invalid.
 */
export function validateStorageCS(settings: { log: ILogger, storage?: any }): ISettings['storage'] {
  const { storage, log } = settings;

  // validate storage
  // @TODO validate its API (Splits cache, MySegments cache, etc) when supporting custom storages
  if (storage) {
    if (typeof storage === 'function') return storage;
    log.warn(WARN_25);
  }

  // return default InMemory storage if provided one is not valid
  return InMemoryStorageCSFactory;
}
