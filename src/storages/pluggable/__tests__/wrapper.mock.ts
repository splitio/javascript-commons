import { startsWith, toNumber } from '../../../utils/lang';

let _cache: Record<string, string> = {};

// An in memory ICustomStorageWrapper implementation with Jest mocks
export const wrapperMock = {

  _cache,

  get: jest.fn((key => {
    return Promise.resolve(key in _cache ? _cache[key] : null);
  })),
  set: jest.fn((key: string, value: string) => {
    const result = key in _cache;
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

function throwsException() {
  throw new Error('some error');
}

function rejectedPromise() {
  return Promise.reject('some error');
}

// @TODO remove if not used
export const wrapperWithExceptions = {
  get: throwsException,
  set: throwsException,
  delete: throwsException,
  getKeysByPrefix: throwsException,
  incr: throwsException,
  decr: throwsException,
  getMany: throwsException,
  connect: throwsException,
  close: throwsException
};

export const wrapperWithRejectedPromiseResults = {
  get: rejectedPromise,
  set: rejectedPromise,
  delete: rejectedPromise,
  getKeysByPrefix: rejectedPromise,
  incr: rejectedPromise,
  decr: rejectedPromise,
  getMany: rejectedPromise,
  connect: rejectedPromise,
  close: rejectedPromise
};
