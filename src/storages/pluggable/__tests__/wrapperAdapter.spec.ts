// @ts-nocheck
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import thenable from '../../../utils/promise/thenable';
import { LOG_PREFIX } from '../constants';

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
  pushItems: rejectedPromise,
  popItems: invalidThenable,
  getItemsCount: 'invalid value',
  itemContains: throwsException,
  addItems: { then: 10 },
  removeItems: invalidThenable,
  getItems: { then: () => { throw new Error(); } }
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
  'pushItems': ['some_key_list', ['item1', 'item2']],
  'popItems': ['some_key_list'],
  'getItemsCount': ['some_key_list'],
  'itemContains': ['some_key_set', 'some_value'],
  'addItems': ['some_key_set', ['item1', 'item2']],
  'removeItems': ['some_key_set', ['item1', 'item2']],
  'getItems': ['some_key_set'],
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
        expect(loggerMock.error).toHaveBeenCalledWith(`${LOG_PREFIX} Wrapper '${method}' operation threw an error. Message: ${e}`);
      }
    }

    expect(loggerMock.error).toBeCalledTimes(methods.length);
  });

});
