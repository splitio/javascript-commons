import { validateStorageCS } from '../storageCS';
import { InMemoryStorageCSFactory } from '../../../../storages/inMemory/InMemoryStorageCS';
import { loggerMock as log } from '../../../../logger/__tests__/sdkLogger.mock';

const mockInLocalStorageFactory = () => { };
mockInLocalStorageFactory.type = 'LOCALSTORAGE';

const mockPluggableStorageFactory = () => { };
mockPluggableStorageFactory.type = 'PLUGGABLE';

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

  test('throws error if the provided storage factory is not compatible with the mode', () => {
    expect(() => { validateStorageCS({ log, mode: 'consumer', storage: mockInLocalStorageFactory }); }).toThrow('A PluggableStorage instance is required on consumer mode');
    expect(() => { validateStorageCS({ log, mode: 'consumer_partial', storage: mockInLocalStorageFactory }); }).toThrow('A PluggableStorage instance is required on consumer mode');

    expect(log.error).not.toBeCalled();

    expect(validateStorageCS({ log, mode: 'standalone', storage: mockPluggableStorageFactory })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ log, mode: 'localhost', storage: mockPluggableStorageFactory })).toBe(InMemoryStorageCSFactory);

    expect(log.error).toBeCalledTimes(2);
  });

});
