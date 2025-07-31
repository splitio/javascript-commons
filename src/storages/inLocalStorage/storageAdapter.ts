import { ILogger } from '../../logger/types';
import SplitIO from '../../../types/splitio';
import { LOG_PREFIX } from './constants';
import { StorageAdapter } from '../types';

function isTillKey(key: string) {
  return key.endsWith('.till');
}

export function storageAdapter(log: ILogger, prefix: string, wrapper: SplitIO.StorageWrapper): StorageAdapter {
  let cache: Record<string, string> = {};

  let connectPromise: Promise<void> | undefined;
  let disconnectPromise = Promise.resolve();

  return {
    load() {
      return connectPromise || (connectPromise = Promise.resolve(wrapper.getItem(prefix)).then((storedCache) => {
        cache = JSON.parse(storedCache || '{}');
      }).catch((e) => {
        log.error(LOG_PREFIX + 'Rejected promise calling storage getItem, with error: ' + e);
      }));
    },
    save() {
      return disconnectPromise = disconnectPromise.then(() => {
        return Promise.resolve(wrapper.setItem(prefix, JSON.stringify(cache))).catch((e) => {
          log.error(LOG_PREFIX + 'Rejected promise calling storage setItem, with error: ' + e);
        });
      });
    },

    get length() {
      return Object.keys(cache).length;
    },
    getItem(key: string) {
      return cache[key] || null;
    },
    key(index: number) {
      return Object.keys(cache)[index] || null;
    },
    removeItem(key: string) {
      delete cache[key];
      if (isTillKey(key)) this.save!();
    },
    setItem(key: string, value: string) {
      cache[key] = value;
      if (isTillKey(key)) this.save!();
    }
  };
}
