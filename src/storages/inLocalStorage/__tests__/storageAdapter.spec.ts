import { storageAdapter } from '../storageAdapter';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';


const syncWrapper = {
  getItem: jest.fn(() => JSON.stringify({ key1: 'value1' })),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

const asyncWrapper = {
  getItem: jest.fn(() => Promise.resolve(JSON.stringify({ key1: 'value1' }))),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
};

test.each([
  [syncWrapper],
  [asyncWrapper],
])('storageAdapter', async (wrapper) => {

  const storage = storageAdapter(loggerMock, 'prefix', wrapper);

  expect(storage.length).toBe(0);

  // Load cache from storage wrapper
  await storage.load();

  expect(wrapper.getItem).toHaveBeenCalledWith('prefix');
  expect(storage.length).toBe(1);
  expect(storage.key(0)).toBe('key1');
  expect(storage.getItem('key1')).toBe('value1');

  // Set item
  storage.setItem('key2', 'value2');
  expect(storage.getItem('key2')).toBe('value2');
  expect(storage.length).toBe(2);

  // Remove item
  storage.removeItem('key1');
  expect(storage.getItem('key1')).toBe(null);
  expect(storage.length).toBe(1);

  // Until `save` is called, changes should not be saved/persisted
  await storage.whenSaved();
  expect(wrapper.setItem).not.toHaveBeenCalled();

  storage.setItem('.till', '1');
  expect(storage.length).toBe(2);
  expect(storage.key(0)).toBe('key2');
  expect(storage.key(1)).toBe('.till');

  // When `save` is called, changes should be saved/persisted immediately
  storage.save();
  await storage.whenSaved();
  expect(wrapper.setItem).toHaveBeenCalledWith('prefix', JSON.stringify({ key2: 'value2', '.till': '1' }));

  expect(wrapper.setItem).toHaveBeenCalledTimes(1);

  await storage.whenSaved();
  expect(wrapper.setItem).toHaveBeenCalledTimes(1);
});
