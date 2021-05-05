// @ts-nocheck

// Mocks
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { IStorageFactoryParams } from '../../types';
import { wrapperMock, wrapperMockFactory } from './wrapper.mock';

const metadata = {  s: 'version', i: 'ip', n: 'hostname' };
const prefix = 'some_prefix';

// Test target
import { PluggableStorage } from '../index';
import { assertStorageInterface } from '../../__tests__/testUtils';

describe('PLUGGABLE STORAGE', () => {

  const internalSdkParams: IStorageFactoryParams = {
    log: loggerMock,
    metadata
  };

  afterEach(() => {
    wrapperMock.mockClear();
  });

  test('creates a storage instance', async () => {
    const storageFactory = PluggableStorage({ prefix, wrapper: wrapperMock });
    const storage = storageFactory(internalSdkParams);

    assertStorageInterface(storage); // the instance must implement the storage interface
    expect(wrapperMock.connect).toBeCalledTimes(1); // wrapper connect method should be called once when storage is created

    expect(await storage.splits.getSplit('some_split')).toBe(null);
    expect(wrapperMock.get).toBeCalledWith(`${prefix}.SPLITIO.split.some_split`); // keys prefix should be the provided one

    await storage.destroy();
    expect(wrapperMock.close).toBeCalledTimes(1); // wrapper close method should be called once when storage is destroyed
  });

  test('throws an exception if wrapper doesn\'t implement the expected interface', async () => {

    expect(() => PluggableStorage({ wrapper: wrapperMock })).not.toThrow(); // not prefix but valid wrapper is OK

    // Throws exception if no object is passed as wrapper
    const errorNoWrapper = 'No `wrapper` option was provided';
    expect(() => PluggableStorage()).toThrow(errorNoWrapper);
    expect(() => PluggableStorage({ wrapper: undefined })).toThrow(errorNoWrapper);
    expect(() => PluggableStorage({ wrapper: 'invalid wrapper' })).toThrow(errorNoWrapper);

    // Throws exception if the given object is not a valid wrapper, informing which methods are missing
    const invalidWrapper = wrapperMockFactory();
    invalidWrapper.connect = undefined;
    invalidWrapper.close = 'invalid function';
    expect(() => PluggableStorage({ wrapper: invalidWrapper })).toThrow('Wrapper instance must implement the following methods: connect,close');
    expect(() => PluggableStorage({ wrapper: {} })).toThrow('Wrapper instance must implement the following methods: get,set,getAndSet,del,getKeysByPrefix,getByPrefix,incr,decr,getMany,pushItems,popItems,getItemsCount,itemContains,connect,close');
  });

});
