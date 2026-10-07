// Mocks
const fakeInMemoryStorage = 'fakeStorage';
const fakeInMemoryStorageFactory = jest.fn(() => fakeInMemoryStorage);
jest.mock('../../inMemory/InMemoryStorageCS', () => {
  return {
    InMemoryStorageCSFactory: fakeInMemoryStorageFactory
  };
});

import { IStorageFactoryParams, IStorageSync } from '../../types';
import { assertStorageInterface } from '../../__tests__/testUtils';
import { fullSettings } from '../../../utils/settingsValidation/__tests__/settings.mocks';
import { createMemoryStorage } from './wrapper.mock';
import * as storageAdapter from '../storageAdapter';

const storageAdapterSpy = jest.spyOn(storageAdapter, 'storageAdapter');

// Test target
import { InLocalStorage } from '../index';

describe('IN LOCAL STORAGE', () => {

  // @ts-ignore
  const internalSdkParams: IStorageFactoryParams = { settings: fullSettings };

  afterEach(() => {
    fakeInMemoryStorageFactory.mockClear();
  });

  test('fallback to InMemoryStorage if LocalStorage API is not available or the provided storage wrapper is invalid', () => {
    // Delete global localStorage property
    const originalLocalStorage = Object.getOwnPropertyDescriptor(global, 'localStorage');
    Object.defineProperty(global, 'localStorage', {});

    // LocalStorage API is not available
    let storageFactory = InLocalStorage({ prefix: 'prefix' });
    let storage = storageFactory(internalSdkParams);
    expect(fakeInMemoryStorageFactory).toBeCalledWith(internalSdkParams); // calls InMemoryStorage factory
    expect(storage).toBe(fakeInMemoryStorage);

    // @ts-expect-error Provided storage is invalid
    storageFactory = InLocalStorage({ prefix: 'prefix', wrapper: {} });
    storage = storageFactory(internalSdkParams);
    expect(storage).toBe(fakeInMemoryStorage);

    // Provided storage is valid
    storageFactory = InLocalStorage({ prefix: 'prefix', wrapper: createMemoryStorage() });
    storage = storageFactory(internalSdkParams);
    expect(storage).not.toBe(fakeInMemoryStorage);

    // Restore original localStorage
    Object.defineProperty(global, 'localStorage', originalLocalStorage as PropertyDescriptor);
  });

  test('calls InLocalStorage if LocalStorage API is available', () => {

    const storageFactory = InLocalStorage({ prefix: 'prefix' });
    const storage = storageFactory(internalSdkParams);

    assertStorageInterface(storage); // the instance must implement the storage interface
    expect(fakeInMemoryStorageFactory).not.toBeCalled(); // doesn't call InMemoryStorage factory
  });

  test('disableFlagSetCache option is validated and passed to the splits cache', () => {
    const log = fullSettings.log as jest.Mocked<typeof fullSettings.log>;
    const params = { settings: { ...fullSettings, log } } as unknown as IStorageFactoryParams;
    (log.error as jest.Mock).mockClear();

    // valid values
    let storage = InLocalStorage({ prefix: 'prefix', wrapper: createMemoryStorage(), disableFlagSetCache: true })(params) as IStorageSync;
    expect(storage.splits.getNamesByFlagSets(['a'])).toEqual([new Set()]);
    expect(log.error).toBeCalledTimes(1); // flag set cache disabled error

    (log.error as jest.Mock).mockClear();
    storage = InLocalStorage({ prefix: 'prefix', wrapper: createMemoryStorage() })(params) as IStorageSync;
    expect(storage.splits.getNamesByFlagSets(['a'])).toEqual([new Set()]);
    expect(log.error).not.toBeCalled();

    // invalid value is ignored (flag set cache enabled) with an error log
    // @ts-expect-error Provided option is invalid
    storage = InLocalStorage({ prefix: 'prefix', wrapper: createMemoryStorage(), disableFlagSetCache: 'true' })(params) as IStorageSync;
    expect(log.error).toBeCalledTimes(1);
    (log.error as jest.Mock).mockClear();
    storage.splits.getNamesByFlagSets(['a']);
    expect(log.error).not.toBeCalled();
  });

  test('calls InLocalStorage if the provided storage wrapper is valid', () => {
    storageAdapterSpy.mockClear();

    // Web Storages should not use the storageAdapter
    let storageFactory = InLocalStorage({ prefix: 'prefix', wrapper: localStorage });
    let storage = storageFactory(internalSdkParams);
    assertStorageInterface(storage);
    expect(fakeInMemoryStorageFactory).not.toBeCalled();
    expect(storageAdapterSpy).not.toBeCalled();

    storageFactory = InLocalStorage({ prefix: 'prefix', wrapper: sessionStorage });
    storage = storageFactory(internalSdkParams);
    assertStorageInterface(storage);
    expect(fakeInMemoryStorageFactory).not.toBeCalled();
    expect(storageAdapterSpy).not.toBeCalled();

    // Non Web Storages should use the storageAdapter
    storageFactory = InLocalStorage({ prefix: 'prefix', wrapper: createMemoryStorage() });
    storage = storageFactory(internalSdkParams);

    assertStorageInterface(storage);
    expect(fakeInMemoryStorageFactory).not.toBeCalled();
    expect(storageAdapterSpy).toBeCalled();
  });

});
