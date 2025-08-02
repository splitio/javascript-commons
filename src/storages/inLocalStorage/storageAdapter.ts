import { ILogger } from '../../logger/types';
import SplitIO from '../../../types/splitio';
import { LOG_PREFIX } from './constants';
import { StorageAdapter } from '../types';

function isTillKey(key: string) {
  return key.endsWith('.till');
}

export function storageAdapter(log: ILogger, prefix: string, wrapper: SplitIO.StorageWrapper): Required<StorageAdapter> {
  let keys: string[] = [];
  let values: string[] = [];

  let loadPromise: Promise<void> | undefined;
  let savePromise = Promise.resolve();

  function _save() {
    return savePromise = savePromise.then(() => {
      const cache = keys.reduce((acc, key, index) => {
        acc[key] = values[index];
        return acc;
      }, {} as Record<string, string>);
      return Promise.resolve(wrapper.setItem(prefix, JSON.stringify(cache)));
    }).catch((e) => {
      log.error(LOG_PREFIX + 'Rejected promise calling wrapper `setItem` method, with error: ' + e);
    });
  }

  return {
    load() {
      return loadPromise || (loadPromise = Promise.resolve().then(() => {
        return wrapper.getItem(prefix);
      }).then((storedCache) => {
        const cache = JSON.parse(storedCache || '{}');
        keys = Object.keys(cache);
        values = keys.map(key => cache[key]);
      }).catch((e) => {
        log.error(LOG_PREFIX + 'Rejected promise calling wrapper `getItem` method, with error: ' + e);
      }));
    },
    whenSaved() {
      return savePromise;
    },

    get length() {
      return keys.length;
    },
    getItem(key: string) {
      const index = keys.indexOf(key);
      if (index === -1) return null;
      return values[index];
    },
    key(index: number) {
      return keys[index] || null;
    },
    removeItem(key: string) {
      const index = keys.indexOf(key);
      if (index === -1) return;
      keys.splice(index, 1);
      values.splice(index, 1);

      if (isTillKey(key)) _save();
    },
    setItem(key: string, value: string) {
      let index = keys.indexOf(key);
      if (index === -1) index = keys.push(key) - 1;
      values[index] = value;

      if (isTillKey(key)) _save();
    }
  };
}
