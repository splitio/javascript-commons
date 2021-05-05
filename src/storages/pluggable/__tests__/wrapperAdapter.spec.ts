// @ts-nocheck
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import thenable from '../../../utils/promise/thenable';
import { LOG_PREFIX } from '../constants';
import { SplitError } from '../../../utils/lang/errors';

/** Mocks */

import { wrapperMock } from './wrapper.mock';

function throwsException() {
  throw new Error('some error');
}

function rejectedPromise() {
  return Promise.reject('some error');
}

function invalidThenable() {
  return { then() { } };
}

export const wrapperWithIssues = {
  get: undefined,
  set: 'invalid value',
  del: throwsException,
  getKeysByPrefix: rejectedPromise,
  incr: invalidThenable,
  decr: 'invalid value',
  getMany: throwsException,
  connect: rejectedPromise,
  close: invalidThenable,
  getAndSet: 'invalid value',
  getByPrefix: throwsException,
  pushItems: rejectedPromise,
  popItems: invalidThenable,
  getItemsCount: 'invalid value',
  itemContains: throwsException,
};

export const wrapperWithValuesToSanitize = {
  get: () => Promise.resolve(10),
  set: () => Promise.resolve('tRue'),
  del: () => Promise.resolve(), // no result
  getKeysByPrefix: () => Promise.resolve(['1', null, false, true, '2', null]),
  incr: () => Promise.resolve('1'),
  decr: () => Promise.resolve('0'),
  getMany: () => Promise.resolve(['1', null, false, true, '2', null]),
  connect: () => Promise.resolve(1),
  getAndSet: () => Promise.resolve(true),
  getByPrefix: () => Promise.resolve(['1', null, false, true, '2', null]),
  popItems: () => Promise.resolve('invalid array'),
  getItemsCount: () => Promise.resolve('10'),
  itemContains: () => Promise.resolve('true'),
};

const SANITIZED_RESULTS = {
  get: '10',
  set: true,
  del: false,
  getKeysByPrefix: ['1', '2'],
  incr: false,
  decr: false,
  getMany: ['1', null, '2', null],
  connect: false,
  getAndSet: 'true',
  getByPrefix: ['1', '2'],
  popItems: [],
  getItemsCount: 10,
  itemContains: true,
};

const VALID_METHOD_CALLS = {
  'get': ['some_key'],
  'set': ['some_key', 'some_value'],
  'del': ['some_key'],
  'getKeysByPrefix': ['some_prefix'],
  'incr': ['some_key'],
  'decr': ['some_key'],
  'getMany': [['some_key_1', 'some_key_2']],
  'connect': [],
  'close': [],
  'getAndSet': ['some_key', 'some_value'],
  'getByPrefix': ['some_prefix'],
  'pushItems': ['some_key_list', ['item1', 'item2']],
  'popItems': ['some_key'],
  'getItemsCount': ['some_key'],
  'itemContains': ['some_key', 'some_value'],
};

// Test target
import { wrapperAdapter } from '../wrapperAdapter';

describe('Wrapper Adapter', () => {

  afterEach(() => {
    loggerMock.mockClear();
    wrapperMock.mockClear();
  });

  test('calls original wrapper methods', async () => {
    const instance = wrapperAdapter(loggerMock, wrapperMock);
    const methods = Object.keys(VALID_METHOD_CALLS);

    for (let i = 0; i < methods.length; i++) {
      const method = methods[i];
      const result = instance[method](...VALID_METHOD_CALLS[method]);
      expect(wrapperMock[method]).toBeCalledTimes(1);
      expect(wrapperMock[method]).toBeCalledWith(...VALID_METHOD_CALLS[method]);
      expect(wrapperMock[method]).toHaveReturnedWith(result);
      await result;
    }

    // no logs if there isn't issues
    expect(loggerMock.error).not.toBeCalled();
    expect(loggerMock.warn).not.toBeCalled();
  });

  test('handle wrapper call exceptions', async () => {
    const instance = wrapperAdapter(loggerMock, wrapperWithIssues);
    const methods = Object.keys(VALID_METHOD_CALLS);

    for (let i = 0; i < methods.length; i++) {
      const method = methods[i];
      const result = instance[method](...VALID_METHOD_CALLS[method]);
      expect(thenable(result)).toBe(true);
      try {
        await result;
        expect(true).toBe(false); // promise shouldn't be resolved
      } catch (e) {
        expect(e).toBeInstanceOf(SplitError);
        expect(loggerMock.error).toHaveBeenCalledWith(`${LOG_PREFIX} Wrapper '${method}' operation threw an error. Message: ${e.message}`);
      }
    }

    expect(loggerMock.error).toBeCalledTimes(methods.length);
  });

  test('sanitize wrapper call results', async () => {
    const instance = wrapperAdapter(loggerMock, wrapperWithValuesToSanitize);
    const methods = Object.keys(SANITIZED_RESULTS);

    for (let i = 0; i < methods.length; i++) {
      try {
        const method = methods[i];
        const result = await instance[method](...VALID_METHOD_CALLS[method]);

        expect(result).toEqual(SANITIZED_RESULTS[method]); // result should be sanitized
      } catch (e) {
        expect(true).toBe(methods[i]); // promise shouldn't be rejected
      }
    }

    expect(loggerMock.warn).toBeCalledTimes(methods.length); // one warning for each wrapper operation call which result had to be sanitized
  });

});
