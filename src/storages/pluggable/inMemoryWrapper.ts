import { IPluggableStorageWrapper } from '../types';
import { startsWith, toNumber } from '../../utils/lang';
import { ISet, setToArray, _Set } from '../../utils/lang/sets';

/**
 * Creates a IPluggableStorageWrapper implementation that stores items in memory.
 * The `_cache` property is the object were items are stored.
 * Intended for testing purposes.
 *
 * @param connDelay delay in millis for `connect` resolve. If not provided, `connect` resolves inmediatelly.
 */
export function inMemoryWrapperFactory(connDelay?: number): IPluggableStorageWrapper & { _cache: Record<string, string | string[] | ISet<string>>, _setConnDelay(connDelay: number): void } {

  let _cache: Record<string, string | string[] | ISet<string>> = {};
  let _connDelay = connDelay;

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
    incr(key: string, increment = 1) {
      if (key in _cache) {
        const count = toNumber(_cache[key]) + increment;
        if (isNaN(count)) return Promise.reject('Given key is not a number');
        _cache[key] = count + '';
        return Promise.resolve(count);
      } else {
        _cache[key] = '' + increment;
        return Promise.resolve(1);
      }
    },
    decr(key: string, decrement = 1) {
      if (key in _cache) {
        const count = toNumber(_cache[key]) - decrement;
        if (isNaN(count)) return Promise.reject('Given key is not a number');
        _cache[key] = count + '';
        return Promise.resolve(count);
      } else {
        _cache[key] = '-' + decrement;
        return Promise.resolve(-1);
      }
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
      if (set instanceof _Set) return Promise.resolve(set.has(item));
      return Promise.reject('key is not a set');
    },
    addItems(key: string, items: string[]) {
      if (!(key in _cache)) _cache[key] = new _Set();
      const set = _cache[key];
      if (set instanceof _Set) {
        items.forEach(item => set.add(item));
        return Promise.resolve();
      }
      return Promise.reject('key is not a set');
    },
    removeItems(key: string, items: string[]) {
      if (!(key in _cache)) _cache[key] = new _Set();
      const set = _cache[key];
      if (set instanceof _Set) {
        items.forEach(item => set.delete(item));
        return Promise.resolve();
      }
      return Promise.reject('key is not a set');
    },
    getItems(key: string) {
      const set = _cache[key];
      if (!set) return Promise.resolve([]);
      if (set instanceof _Set) return Promise.resolve(setToArray(set));
      return Promise.reject('key is not a set');
    },

    // always connects and disconnects
    connect() {
      if (typeof _connDelay === 'number') {
        return new Promise(res => setTimeout(res, _connDelay));
      } else {
        return Promise.resolve();
      }
    },
    disconnect() { return Promise.resolve(); },

    // for testing
    _setConnDelay(connDelay: number) {
      _connDelay = connDelay;
    }
  };
}
