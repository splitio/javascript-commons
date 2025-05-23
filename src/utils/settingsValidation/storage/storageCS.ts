import { InMemoryStorageCSFactory } from '../../../storages/inMemory/InMemoryStorageCS';
import { ISettings } from '../../../types';
import SplitIO from '../../../../types/splitio';
import { ILogger } from '../../../logger/types';
import { ERROR_STORAGE_INVALID } from '../../../logger/constants';
import { LOCALHOST_MODE, STANDALONE_MODE, STORAGE_PLUGGABLE, STORAGE_LOCALSTORAGE, STORAGE_MEMORY } from '../../../utils/constants';

/**
 * This function validates `settings.storage` object
 *
 * @param settings - config object provided by the user to initialize the sdk
 *
 * @returns valid storage factory. Default to `InMemoryStorageCSFactory` if the provided storage is invalid or not compatible with the sdk mode if mode is standalone or localhost
 *
 * @throws error if mode is consumer and the provided storage is not compatible
 */
export function validateStorageCS(settings: { log: ILogger, storage?: any, mode: SplitIO.SDKMode }): ISettings['storage'] {
  let { storage = InMemoryStorageCSFactory, log, mode } = settings;

  // If an invalid storage is provided, fallback into MEMORY
  if (typeof storage !== 'function' || [STORAGE_MEMORY, STORAGE_LOCALSTORAGE, STORAGE_PLUGGABLE].indexOf(storage.type) === -1) {
    storage = InMemoryStorageCSFactory;
    log.error(ERROR_STORAGE_INVALID);
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
