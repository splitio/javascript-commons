import { startsWith, toNumber } from '../../../utils/lang';

let _cache: Record<string, string> = {};
let _queues: Record<string, string[]> = {};

// An in memory ICustomStorageWrapper implementation with Jest mocks
export const wrapperMock = {

  _cache,
  _queues,

  get: jest.fn((key => {
    return Promise.resolve(key in _cache ? _cache[key] : null);
  })),
  set: jest.fn((key: string, value: string) => {
    const result = key in _cache;
    _cache[key] = value;
    return Promise.resolve(result);
  }),
  getAndSet: jest.fn((key: string, value: string) => {
    const result = key in _cache ? _cache[key] : null;
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
  getByPrefix: jest.fn((prefix: string) => {
    return Promise.resolve(Object.keys(_cache).filter(key => startsWith(key, prefix)).map(key => _cache[key]));
  }),
  incr: jest.fn((key: string) => {
    if (key in _cache) {
      const count = toNumber(_cache[key]) + 1;
      if (isNaN(count)) return Promise.resolve(false);
      _cache[key] = count + '';
    } else {
      _cache[key] = '1';
    }
    return Promise.resolve(true);
  }),
  decr: jest.fn((key: string) => {
    if (key in _cache) {
      const count = toNumber(_cache[key]) - 1;
      if (isNaN(count)) return Promise.resolve(false);
      _cache[key] = count + '';
    } else {
      _cache[key] = '-1';
    }
    return Promise.resolve(true);
  }),
  getMany: jest.fn((keys: string[]) => {
    return Promise.resolve(keys.map(key => _cache[key] ? _cache[key] : null));
  }),
  pushItems: jest.fn((key: string, items: string[]) => {
    if (!(key in _queues)) _queues[key] = [];
    _queues[key].push(...items);
    return Promise.resolve(true);
  }),
  popItems: jest.fn((key: string, count: number) => {
    return Promise.resolve(key in _queues ? _queues[key].splice(0, count) : []);
  }),
  getItemsCount: jest.fn((key: string) => {
    return Promise.resolve(key in _queues ? _queues[key].length : 0);
  }),
  itemContains: jest.fn((key: string, item: string) => {
    return Promise.resolve(key in _queues && _queues[key].indexOf(item) > -1 ? true : false);
  }),

  // always connects and close
  connect: jest.fn(() => Promise.resolve(true)),
  close: jest.fn(() => Promise.resolve()),

  mockClear() {
    _cache = {};
    this.get.mockClear();
    this.set.mockClear();
    this.del.mockClear();
    this.getKeysByPrefix.mockClear();
    this.incr.mockClear();
    this.decr.mockClear();
    this.getMany.mockClear();
    this.connect.mockClear();
    this.close.mockClear();
  }
};
