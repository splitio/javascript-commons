// @ts-nocheck

// Mocks
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { IStorageFactoryParams } from '../../types';
import { wrapperMock, wrapperMockFactory } from './wrapper.mock';

const metadata = { s: 'version', i: 'ip', n: 'hostname' };
const prefix = 'some_prefix';

// Test target
import { PluggableStorage } from '../index';
import { assertStorageInterface, assertSyncRecorderCacheInterface } from '../../__tests__/testUtils';
import { CONSUMER_PARTIAL_MODE } from '../../../utils/constants';

describe('PLUGGABLE STORAGE', () => {

  const internalSdkParams: IStorageFactoryParams = {
    log: loggerMock,
    metadata,
    onReadyCb: jest.fn()
  };

  afterEach(() => {
    wrapperMock.mockClear();
  });

  test('creates a storage instance', async () => {
    const storageFactory = PluggableStorage({ prefix, wrapper: wrapperMock });
    const storage = storageFactory(internalSdkParams);

    assertStorageInterface(storage); // the instance must implement the storage interface
    expect(wrapperMock.connect).toBeCalledTimes(1); // wrapper connect method should be called once when storage is created

    // shared storage has the same cache items than storage instance, but a no-op destroy
    const sharedOnReadyCb = jest.fn();
    const sharedStorage = storage.shared('some_key', sharedOnReadyCb);
    assertStorageInterface(sharedStorage);
    expect(sharedStorage.splits).toBe(storage.splits);
    expect(wrapperMock.connect).toBeCalledTimes(2);

    expect(await storage.splits.getSplit('some_split')).toBe(null);
    expect(await sharedStorage.splits.getSplit('some_split')).toBe(null);
    expect(wrapperMock.get).toBeCalledTimes(2);
    expect(wrapperMock.get).toBeCalledWith(`${prefix}.SPLITIO.split.some_split`); // keys prefix should be the provided one

    await storage.destroy();
    await sharedStorage.destroy();
    expect(wrapperMock.disconnect).toBeCalledTimes(1); // wrapper disconnect method should be called once when storage is destroyed

    expect(internalSdkParams.onReadyCb).toBeCalledTimes(1); // onReady callback should be called when the wrapper connect resolved with true
    expect(sharedOnReadyCb).toBeCalledTimes(1);
  });

  test('throws an exception if wrapper doesn\'t implement the expected interface', async () => {

    expect(() => PluggableStorage({ wrapper: wrapperMock })).not.toThrow(); // not prefix but valid wrapper is OK

    // Throws exception if no object is passed as wrapper
    const errorNoValidWrapper = 'Expecting pluggable storage `wrapper` in options, but no valid wrapper instance was provided.';
    expect(() => PluggableStorage()).toThrow(errorNoValidWrapper);
    expect(() => PluggableStorage({ wrapper: undefined })).toThrow(errorNoValidWrapper);
    expect(() => PluggableStorage({ wrapper: 'invalid wrapper' })).toThrow(errorNoValidWrapper);

    // Throws exception if the given object is not a valid wrapper, informing which methods are missing
    const invalidWrapper = wrapperMockFactory();
    invalidWrapper.connect = undefined;
    invalidWrapper.disconnect = 'invalid function';
    const errorNoValidWrapperInterface = 'The provided wrapper instance doesn’t follow the expected interface. Check our docs.';
    expect(() => PluggableStorage({ wrapper: invalidWrapper })).toThrow(errorNoValidWrapperInterface);
    expect(() => PluggableStorage({ wrapper: {} })).toThrow(errorNoValidWrapperInterface);
  });

  test('creates a storage instance for partial consumer mode (events and impressions cache in memory)', async () => {
    const storageFactory = PluggableStorage({ prefix, wrapper: wrapperMock });
    const storage = storageFactory({ ...internalSdkParams, mode: CONSUMER_PARTIAL_MODE, optimize: true });

    assertStorageInterface(storage);
    expect(wrapperMock.connect).toBeCalledTimes(1);

    // Sync cache
    assertSyncRecorderCacheInterface(storage.events);
    assertSyncRecorderCacheInterface(storage.impressions);
    assertSyncRecorderCacheInterface(storage.impressionCounts);

    // But event track is async
    const eventResult = storage.events.track('some data');
    expect(typeof eventResult.then === 'function').toBeTruthy();
    expect(await eventResult).toBe(true);

    const impResult = storage.impressions.track(['some data']);
    expect(impResult).toBe(undefined);
  });
});
