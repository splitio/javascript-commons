import { validateStorageCS } from '../storageCS';
import { InMemoryStorageCSFactory } from '../../../../storages/inMemory/InMemoryStorageCS';


describe('storage validator for pluggable storage (client-side)', () => {

  // Check different types, since `storage` param is defined by the user
  test('fallbacks to default InMemory storage if the storage is invalid or not provided', () => {
    expect(validateStorageCS({})).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ storage: undefined })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ storage: {} })).toBe(InMemoryStorageCSFactory);
    expect(validateStorageCS({ storage: 'invalid storage' })).toBe(InMemoryStorageCSFactory);
  });

  test('returns the provided storage factory if it is valid', () => {
    const mockStorageFactory = () => {};
    expect(validateStorageCS({ storage: mockStorageFactory })).toBe(mockStorageFactory);
  });

});
