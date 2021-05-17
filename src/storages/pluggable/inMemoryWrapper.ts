import { ICustomStorageWrapper } from '../types';
import { startsWith, toNumber } from '../../utils/lang';
import { setToArray } from '../../utils/lang/sets';

// Creates an in memory ICustomStorageWrapper implementation
// Intended for testing purposes.
export function inMemoryWrapperFactory(): ICustomStorageWrapper & { _cache: Record<string, string | string[] | Set<string>> } {

  let _cache: Record<string, string | string[] | Set<string>> = {};

  return {
    /** Holds items (for key-value operations), list of items (for list operations) and set of items (for set operations) */
    _cache,

    get(key) {
      return Promise.resolve(key in _cache ? _cache[key] as string : null);
    },
    set(key: string, value: string) {
      const result = key in _cache;
      _cache[key] = value;
      return Promise.resolve(result);
    },
    getAndSet(key: string, value: string) {
      const result = key in _cache ? _cache[key] as string : null;
      _cache[key] = value;
      return Promise.resolve(result);
    },
    del(key: string) {
      const result = key in _cache;
      delete _cache[key];
      return Promise.resolve(result);
    },
    getKeysByPrefix(prefix: string) {
      return Promise.resolve(Object.keys(_cache).filter(key => startsWith(key, prefix)));
    },
    getByPrefix(prefix: string) {
      return Promise.resolve(Object.keys(_cache).filter(key => startsWith(key, prefix)).map(key => _cache[key] as string));
    },
    incr(key: string) {
      if (key in _cache) {
        const count = toNumber(_cache[key]) + 1;
        if (isNaN(count)) return Promise.resolve(false);
        _cache[key] = count + '';
      } else {
        _cache[key] = '1';
      }
      return Promise.resolve(true);
    },
    decr(key: string) {
      if (key in _cache) {
        const count = toNumber(_cache[key]) - 1;
        if (isNaN(count)) return Promise.resolve(false);
        _cache[key] = count + '';
      } else {
        _cache[key] = '-1';
      }
      return Promise.resolve(true);
    },
    getMany(keys: string[]) {
      return Promise.resolve(keys.map(key => _cache[key] ? _cache[key] as string : null));
    },
    pushItems(key: string, items: string[]) { // @ts-ignore
      if (!(key in _cache)) _cache[key] = [];
      const list = _cache[key];
      if (Array.isArray(list)) {
        list.push(...items);
        return Promise.resolve();
      }
      return Promise.reject('key is not a list');
    },
    popItems(key: string, count: number) {
      const list = _cache[key];
      return Promise.resolve(Array.isArray(list) ? list.splice(0, count) : []);
    },
    getItemsCount(key: string) {
      const list = _cache[key];
      return Promise.resolve(Array.isArray(list) ? list.length : 0);
    },
    itemContains(key: string, item: string) {
      const set = _cache[key];
      if (!set) return Promise.resolve(false);
      if (set instanceof Set) return Promise.resolve(set.has(item));
      return Promise.reject('key is not a set');
    },
    addItems(key: string, items: string[]) {
      if (!(key in _cache)) _cache[key] = new Set();
      const set = _cache[key];
      if (set instanceof Set) {
        items.forEach(item => set.add(item));
        return Promise.resolve();
      }
      return Promise.reject('key is not a set');
    },
    removeItems(key: string, items: string[]) {
      if (!(key in _cache)) _cache[key] = new Set();
      const set = _cache[key];
      if (set instanceof Set) {
        items.forEach(item => set.delete(item));
        return Promise.resolve();
      }
      return Promise.reject('key is not a set');
    },
    getItems(key: string) {
      const set = _cache[key];
      if (!set) return Promise.resolve([]);
      if (set instanceof Set) return Promise.resolve(setToArray(set));
      return Promise.reject('key is not a set');
    },

    // always connects and close
    connect() { return Promise.resolve(); },
    close() { return Promise.resolve(); },
  };
}
