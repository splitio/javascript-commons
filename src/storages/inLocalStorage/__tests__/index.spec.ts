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

// Test target
import { InLocalStorage } from '../index';

describe('IN LOCAL STORAGE', () => {

  // @ts-ignore
  const internalSdkParams: IStorageFactoryParams = { settings: fullSettings };

  afterEach(() => {
    fakeInMemoryStorageFactory.mockClear();
  });

  test('calls InMemoryStorage factory if LocalStorage API is not available', () => {

    const originalLocalStorage = Object.getOwnPropertyDescriptor(global, 'localStorage');
    Object.defineProperty(global, 'localStorage', {}); // delete global localStorage property

    const storageFactory = InLocalStorage({ prefix: 'prefix' });
    const storage = storageFactory(internalSdkParams);

    expect(fakeInMemoryStorageFactory).toBeCalledWith(internalSdkParams); // calls InMemoryStorage factory
    expect(storage).toBe(fakeInMemoryStorage);

    Object.defineProperty(global, 'localStorage', originalLocalStorage as PropertyDescriptor); // restore original localStorage

  });

  test('calls its own storage factory if LocalStorage API is available', () => {

    const storageFactory = InLocalStorage({ prefix: 'prefix' });
    const storage = storageFactory(internalSdkParams);

    assertStorageInterface(storage); // the instance must implement the storage interface
    expect(fakeInMemoryStorageFactory).not.toBeCalled(); // doesn't call InMemoryStorage factory

  });

});
