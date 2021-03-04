import { validateStorageCS } from '../storageCS';
import { InMemoryStorageCSFactory } from '../../../../storages/inMemory/InMemoryStorageCS';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';


describe('storage validator for pluggable storage (client-side)', () => {

  // Check different types, since `storage` param is defined by the user
  test('fallbacks to default InMemory storage if the storage is invalid or not provided', () => {
    expect(validateStorageCS(loggerMock, {})).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS(loggerMock, { storage: undefined })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS(loggerMock, { storage: {} })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS(loggerMock, { storage: 'invalid storage' })).toBe(InMemoryStorageCSFactory);
  });

  test('returns the provided storage factory if it is valid', () => {
    const mockStorageFactory = () => {};
    expect(validateStorageCS(loggerMock, { storage: mockStorageFactory })).toBe(mockStorageFactory);
  });

});
