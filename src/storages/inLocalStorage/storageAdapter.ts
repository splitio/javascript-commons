import { ILogger } from '../../logger/types';
import SplitIO from '../../../types/splitio';
import { LOG_PREFIX } from './constants';
import { StorageAdapter } from '../types';


export function storageAdapter(log: ILogger, prefix: string, wrapper: SplitIO.SyncStorageWrapper | SplitIO.AsyncStorageWrapper): Required<StorageAdapter> {
  let keys: string[] = [];
  let cache: Record<string, string> = {};

  let loadPromise: Promise<void> | undefined;
  let savePromise = Promise.resolve();

  return {
    load() {
      return loadPromise || (loadPromise = Promise.resolve().then(() => {
        return wrapper.getItem(prefix);
      }).then((storedCache) => {
        cache = JSON.parse(storedCache || '{}');
        keys = Object.keys(cache);
      }).catch((e) => {
        log.error(LOG_PREFIX + 'Rejected promise calling wrapper `getItem` method, with error: ' + e);
      }));
    },

    save() {
      return savePromise = savePromise.then(() => {
        return Promise.resolve(wrapper.setItem(prefix, JSON.stringify(cache)));
      }).catch((e) => {
        log.error(LOG_PREFIX + 'Rejected promise calling wrapper `setItem` method, with error: ' + e);
      });
    },

    whenSaved() {
      return savePromise;
    },

    get length() {
      return keys.length;
    },

    getItem(key: string) {
      return cache[key] || null;
    },

    key(index: number) {
      return keys[index] || null;
    },

    removeItem(key: string) {
      const index = keys.indexOf(key);
      if (index === -1) return;
      keys.splice(index, 1);
      delete cache[key];
    },

    setItem(key: string, value: string) {
      if (keys.indexOf(key) === -1) keys.push(key);
      cache[key] = value;
    }
  };
}
