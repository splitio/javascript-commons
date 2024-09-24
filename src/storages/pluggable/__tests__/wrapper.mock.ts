import { startsWith, toNumber } from '../../../utils/lang';

// Creates an in memory IPluggableStorageWrapper implementation with Jest mocks
export function wrapperMockFactory() {

  /** Holds items and list of items */
  let _cache: Record<string, string | string[] | Set<string>> = {};

  return {
    _cache,

    get: jest.fn((key => {
      return Promise.resolve(key in _cache ? _cache[key] as string : null);
    })),
    set: jest.fn((key: string, value: string) => {
      const result = key in _cache;
      _cache[key] = value;
      return Promise.resolve(result);
    }),
    getAndSet: jest.fn((key: string, value: string) => {
      const result = key in _cache ? _cache[key] as string : null;
      _cache[key] = value;
      return Promise.resolve(result);
    }),
    del: jest.fn((key: string) => {
      const result = key in _cache;
      delete _cache[key];
      return Promise.resolve(result);
    }),
    getKeysByPrefix: jest.fn((prefix: string) => {
      return Promise.resolve(Object.keys(_cache).filter(key => startsWith(key, prefix)));
    }),
    incr: jest.fn((key: string, increment = 1) => {
      if (key in _cache) {
        const count = toNumber(_cache[key]) + increment;
        if (isNaN(count)) return Promise.reject('Given key is not a number');
        _cache[key] = count + '';
        return Promise.resolve(count);
      } else {
        _cache[key] = '' + increment;
        return Promise.resolve(1);
      }
    }),
    decr: jest.fn((key: string, decrement = 1) => {
      if (key in _cache) {
        const count = toNumber(_cache[key]) - decrement;
        if (isNaN(count)) return Promise.reject('Given key is not a number');
        _cache[key] = count + '';
        return Promise.resolve(count);
      } else {
        _cache[key] = '-' + decrement;
        return Promise.resolve(-1);
      }
    }),
    getMany: jest.fn((keys: string[]) => {
      return Promise.resolve(keys.map(key => _cache[key] ? _cache[key] as string : null));
    }),
    pushItems: jest.fn((key: string, items: string[]) => { // @ts-ignore
      if (!(key in _cache)) _cache[key] = [];
      const list = _cache[key];
      if (Array.isArray(list)) {
        list.push(...items);
        return Promise.resolve();
      }
      return Promise.reject('key is not a list');
    }),
    popItems: jest.fn((key: string, count: number) => {
      const list = _cache[key];
      return Promise.resolve(Array.isArray(list) ? list.splice(0, count) : []);
    }),
    getItemsCount: jest.fn((key: string) => {
      const list = _cache[key];
      return Promise.resolve(Array.isArray(list) ? list.length : 0);
    }),
    itemContains: jest.fn((key: string, item: string) => {
      const set = _cache[key];
      if (!set) return Promise.resolve(false);
      if (set instanceof Set) return Promise.resolve(set.has(item));
      return Promise.reject('key is not a set');
    }),
    addItems: jest.fn((key: string, items: string[]) => {
      if (!(key in _cache)) _cache[key] = new Set();
      const set = _cache[key];
      if (set instanceof Set) {
        items.forEach(item => set.add(item));
        return Promise.resolve();
      }
      return Promise.reject('key is not a set');
    }),
    removeItems: jest.fn((key: string, items: string[]) => {
      if (!(key in _cache)) _cache[key] = new Set();
      const set = _cache[key];
      if (set instanceof Set) {
        items.forEach(item => set.delete(item));
        return Promise.resolve();
      }
      return Promise.reject('key is not a set');
    }),
    getItems: jest.fn((key: string) => {
      const set = _cache[key];
      if (!set) return Promise.resolve([]);
      if (set instanceof Set) return Promise.resolve(Array.from(set));
      return Promise.reject('key is not a set');
    }),

    // always connects and disconnects
    connect: jest.fn(() => Promise.resolve()),
    disconnect: jest.fn(() => Promise.resolve()),

    mockClear() {
      this.get.mockClear();
      this.set.mockClear();
      this.del.mockClear();
      this.getKeysByPrefix.mockClear();
      this.incr.mockClear();
      this.decr.mockClear();
      this.getMany.mockClear();
      this.connect.mockClear();
      this.disconnect.mockClear();
      this.getAndSet.mockClear();
      this.pushItems.mockClear();
      this.popItems.mockClear();
      this.getItemsCount.mockClear();
      this.itemContains.mockClear();
      this.addItems.mockClear();
      this.removeItems.mockClear();
      this.getItems.mockClear();
    }
  };
}

export const wrapperMock = wrapperMockFactory();
