// Mocks
const fakeInMemoryStorage = 'fakeStorage';
const fakeInMemoryStorageFactory = jest.fn(() => fakeInMemoryStorage);
jest.mock('../../inMemory/InMemoryStorageCS', () => {
  return {
    InMemoryStorageCSFactory: fakeInMemoryStorageFactory
  };
});

import { IStorageFactoryParams } from '../../types';
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

  test('calls InMemoryStorage factory if LocalStorage API is not available or the provided storage wrapper is invalid', () => {
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

  test('calls its own storage factory if LocalStorage API is available', () => {

    const storageFactory = InLocalStorage({ prefix: 'prefix' });
    const storage = storageFactory(internalSdkParams);

    assertStorageInterface(storage); // the instance must implement the storage interface
    expect(fakeInMemoryStorageFactory).not.toBeCalled(); // doesn't call InMemoryStorage factory
  });

  test('calls its own storage factory if the provided storage wrapper is valid', () => {
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
