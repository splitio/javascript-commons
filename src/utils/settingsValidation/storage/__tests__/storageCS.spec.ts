import { validateStorageCS } from '../storageCS';
import { InMemoryStorageCSFactory } from '../../../../storages/inMemory/InMemoryStorageCS';
import { loggerMock as log } from '../../../../logger/__tests__/sdkLogger.mock';


describe('storage validator for pluggable storage (client-side)', () => {

  // Check different types, since `storage` param is defined by the user
  test('fallbacks to default InMemory storage if the storage is invalid or not provided', () => {
    expect(validateStorageCS({ log })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ log, storage: undefined })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ log, storage: {} })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ log, storage: 'invalid storage' })).toBe(InMemoryStorageCSFactory);
  });

  test('returns the provided storage factory if it is valid', () => {
    const mockStorageFactory = () => { };
    expect(validateStorageCS({ log, storage: mockStorageFactory })).toBe(mockStorageFactory);
  });

});
