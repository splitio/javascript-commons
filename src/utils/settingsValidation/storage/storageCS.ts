import { InMemoryStorageCSFactory } from '../../../storages/inMemory/InMemoryStorageCS';
import { ISettings, SDKMode } from '../../../types';
import { ILogger } from '../../../logger/types';
import { WARN_STORAGE_INVALID } from '../../../logger/constants';
import { LOCALHOST_MODE, STANDALONE_MODE, STORAGE_CUSTOM, STORAGE_LOCALSTORAGE, STORAGE_MEMORY } from '../../../utils/constants';
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
 * @returns {Object} valid storage factory. It might be the default `InMemoryStorageCSFactory` if the provided storage is invalid.
 */
export function validateStorageCS(settings: { log: ILogger, storage?: any, mode: SDKMode }): ISettings['storage'] {
  let { storage = InMemoryStorageCSFactory, log, mode } = settings;

  // If an invalid storage is provided, fallback into MEMORY
  if (typeof storage !== 'function' || [STORAGE_MEMORY, STORAGE_LOCALSTORAGE, STORAGE_CUSTOM].indexOf(storage.type) === -1) {
    storage = InMemoryStorageCSFactory;
    log.warn(WARN_STORAGE_INVALID);
  }

  // In localhost mode with InLocalStorage, fallback to a mock InLocalStorage to emit SDK_READY_FROM_CACHE
  if (mode === LOCALHOST_MODE && storage.type === STORAGE_LOCALSTORAGE) {
    return __InLocalStorageMockFactory;
  }

  // @TODO check behaviour
  if ([LOCALHOST_MODE, STANDALONE_MODE].indexOf(mode) === -1) {
    // Consumer modes require an async storage
    if (storage.type !== STORAGE_CUSTOM) throw new Error('A CustomStorage instance is required on consumer modes');
  } else {
    // Standalone and localhost modes require a sync storage
    if (storage.type === STORAGE_CUSTOM) throw new Error('A CustomStorage instance cannot be used on standalone and localhost modes');
  }

  // return default InMemory storage if provided one is not valid
  return storage;
}
