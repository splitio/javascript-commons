import { validateStorageCS, __InLocalStorageMockFactory } from '../storageCS';
import { InMemoryStorageCSFactory } from '../../../../storages/inMemory/InMemoryStorageCS';
import { loggerMock as log } from '../../../../logger/__tests__/sdkLogger.mock';

const mockInLocalStorageFactory = () => { };
mockInLocalStorageFactory.type = 'LOCALSTORAGE';

describe('storage validator for pluggable storage (client-side)', () => {

  afterEach(() => {
    log.warn.mockClear();
  });

  // Check different types, since `storage` param is defined by the user
  test('fallbacks to default InMemory storage if the storage is invalid or not provided', () => {
    expect(validateStorageCS({ log })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ log, storage: undefined })).toBe(InMemoryStorageCSFactory);
    expect(log.warn).not.toBeCalled();

    expect(validateStorageCS({ log, storage: {} })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ log, storage: 'invalid storage' })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ log, storage: () => { } })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ log, storage: () => { }, mode: 'localhost' })).toBe(InMemoryStorageCSFactory);
    expect(log.warn).toBeCalledTimes(4);
  });

  test('returns the provided storage factory if it is valid', () => {
    expect(validateStorageCS({ log, storage: mockInLocalStorageFactory })).toBe(mockInLocalStorageFactory);
    expect(log.warn).not.toBeCalled();
  });

  test('fallbacks to mock InLocalStorage storage if the storage is InLocalStorage and the mode localhost', () => {
    expect(validateStorageCS({ log, storage: mockInLocalStorageFactory, mode: 'localhost' })).toBe(__InLocalStorageMockFactory);
    expect(log.warn).not.toBeCalled();
  });

});
