import { InMemoryStorageCSFactory } from '../../../storages/inMemory/InMemoryStorageCS';
import { ISettings } from '../../../types';
import { logFactory } from '../../../logger/sdkLogger';
const log = logFactory('splitio-settings');

/**
 * This function validates `settings.storage` object
 *
 * @param {any} settings config object provided by the user to initialize the sdk
 *
 * @returns {Object} valid storage factory. It might be the default `InMemoryStorageCSFactory` if the provided storage is invalid.
 */
export function validateStorageCS(settings: any): ISettings['storage'] {
  const { storage } = settings;

  // validate storage
  // @TODO validate its API (Splits cache, MySegments cache, etc) when supporting custom storages
  if (storage) {
    if (typeof storage === 'function') return storage;
    log.w('The provided storage is invalid. Fallbacking into default MEMORY storage');
  }

  // return default InMemory storage if provided one is not valid
  return InMemoryStorageCSFactory;
}
