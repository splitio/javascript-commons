import { validateStorageCS, __InLocalStorageMockFactory } from '../storageCS';
import { InMemoryStorageCSFactory } from '../../../../storages/inMemory/InMemoryStorageCS';
import { loggerMock as log } from '../../../../logger/__tests__/sdkLogger.mock';

const mockInLocalStorageFactory = () => { };
mockInLocalStorageFactory.type = 'LOCALSTORAGE';

const mockCustomStorageFactory = () => { };
mockCustomStorageFactory.type = 'CUSTOM';

describe('storage validator for pluggable storage (client-side)', () => {

  afterEach(() => {
    log.error.mockClear();
  });

  // Check different types, since `storage` param is defined by the user
  test('fallbacks to default InMemory storage if the storage is invalid or not provided', () => {
    expect(validateStorageCS({ log, mode: 'standalone' })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ log, mode: 'standalone', storage: undefined })).toBe(InMemoryStorageCSFactory);
    expect(log.error).not.toBeCalled();

    expect(validateStorageCS({ log, mode: 'standalone', storage: {} })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ log, mode: 'standalone', storage: 'invalid storage' })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ log, mode: 'standalone', storage: () => { } })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ log, mode: 'localhost', storage: () => { } })).toBe(InMemoryStorageCSFactory);
    expect(log.error).toBeCalledTimes(4);
  });

  test('returns the provided storage factory if it is valid', () => {
    expect(validateStorageCS({ log, mode: 'standalone', storage: mockInLocalStorageFactory })).toBe(mockInLocalStorageFactory);
    expect(log.error).not.toBeCalled();
  });

  test('fallbacks to mock InLocalStorage storage if the storage is InLocalStorage and the mode localhost', () => {
    expect(validateStorageCS({ log, mode: 'localhost', storage: mockInLocalStorageFactory })).toBe(__InLocalStorageMockFactory);
    expect(log.error).not.toBeCalled();
  });

  test('throws error if the provided storage factory is not compatible with the mode', () => {
    expect(() => { validateStorageCS({ log, mode: 'consumer', storage: mockInLocalStorageFactory }); }).toThrow('A CustomStorage instance is required on consumer mode');
    expect(() => { validateStorageCS({ log, mode: 'consumer_partial', storage: mockInLocalStorageFactory }); }).toThrow('A CustomStorage instance is required on consumer mode');

    expect(log.error).not.toBeCalled();

    expect(validateStorageCS({ log, mode: 'standalone', storage: mockCustomStorageFactory })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ log, mode: 'localhost', storage: mockCustomStorageFactory })).toBe(InMemoryStorageCSFactory);

    expect(log.error).toBeCalledTimes(2);
  });

});
