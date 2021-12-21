import { InMemoryStorageCSFactory } from '../../../storages/inMemory/InMemoryStorageCS';
import { ISettings, SDKMode } from '../../../types';
import { ILogger } from '../../../logger/types';
import { ERROR_STORAGE_INVALID } from '../../../logger/constants';
import { LOCALHOST_MODE, STANDALONE_MODE, STORAGE_PLUGGABLE, STORAGE_LOCALSTORAGE, STORAGE_MEMORY } from '../../../utils/constants';
import { IStorageFactoryParams, IStorageSync } from '../../../storages/types';

export function __InLocalStorageMockFactory(params: IStorageFactoryParams): IStorageSync {
  const result = InMemoryStorageCSFactory(params);
  result.splits.checkCache = () => true; // to emit SDK_READY_FROM_CACHE
  return result;
}
__InLocalStorageMockFactory.type = STORAGE_MEMORY;

/**
 * This function validates `settings.storage` object
 *
 * @param {any} settings config object provided by the user to initialize the sdk
 *
 * @returns {Object} valid storage factory. Default to `InMemoryStorageCSFactory` if the provided storage is invalid or not compatible with the sdk mode if mode is standalone or localhost
 *
 * @throws error if mode is consumer and the provided storage is not compatible
 */
export function validateStorageCS(settings: { log: ILogger, storage?: any, mode: SDKMode }): ISettings['storage'] {
  let { storage = InMemoryStorageCSFactory, log, mode } = settings;

  // If an invalid storage is provided, fallback into MEMORY
  if (typeof storage !== 'function' || [STORAGE_MEMORY, STORAGE_LOCALSTORAGE, STORAGE_PLUGGABLE].indexOf(storage.type) === -1) {
    storage = InMemoryStorageCSFactory;
    log.error(ERROR_STORAGE_INVALID);
  }

  // In localhost mode with InLocalStorage, fallback to a mock InLocalStorage to emit SDK_READY_FROM_CACHE
  if (mode === LOCALHOST_MODE && storage.type === STORAGE_LOCALSTORAGE) {
    return __InLocalStorageMockFactory;
  }

  if ([LOCALHOST_MODE, STANDALONE_MODE].indexOf(mode) === -1) {
    // Consumer modes require an async storage
    if (storage.type !== STORAGE_PLUGGABLE) throw new Error('A PluggableStorage instance is required on consumer mode');
  } else {
    // Standalone and localhost modes require a sync storage
    if (storage.type === STORAGE_PLUGGABLE) {
      storage = InMemoryStorageCSFactory;
      log.error(ERROR_STORAGE_INVALID, [' It requires consumer mode.']);
    }
  }

  // return default InMemory storage if provided one is not valid
  return storage;
}
