import splitObject from './mocks/input.json';
import splitView from './mocks/output.json';
import { sdkManagerFactory } from '../index';
import { SplitsCacheInMemory } from '../../storages/inMemory/SplitsCacheInMemory';
import { ISdkReadinessManager } from '../../readiness/types';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';

// @ts-expect-error
const sdkReadinessManagerMock = {
  readinessManager: {
    isReady: jest.fn(() => true),
    isDestroyed: jest.fn(() => false)
  },
  sdkStatus: jest.fn()
} as ISdkReadinessManager;

describe('MANAGER API / Sync cache (In Memory)', () => {

  /** Setup: create manager */
  const cache = new SplitsCacheInMemory();
  const manager = sdkManagerFactory(loggerMock, cache, sdkReadinessManagerMock);
  cache.addSplit(splitObject.name, JSON.stringify(splitObject));

  test('List all splits', () => {

    const views = manager.splits();
    expect(views[0]).toEqual(splitView);
  });

  test('Read only one split by name', () => {

    const split = manager.split(splitObject.name);
    expect(split).toEqual(splitView);
  });

  test('List all the split names', () => {

    const names = manager.names();
    expect(names.indexOf(splitObject.name) !== -1).toBe(true);
  });

  test('Input Validation', () => {

    // control assertions to verify that the manager is connected with that cache.
    expect(manager.split(splitObject.name) != null).toBe(true); // control assertion for split.
    expect(manager.splits().length > 0).toBe(true); // control assertion for splits.
    expect(manager.names().length > 0).toBe(true); // control assertion for names.

    // @ts-expect-error
    expect(manager.split(undefined)).toBe(null); // If the split name is invalid, `manager.split(invalidName)` returns null.

    // This is kind of tied to the implementation of the isOperational validator.
    (sdkReadinessManagerMock.readinessManager.isDestroyed as jest.Mock).mockImplementation(() => true);

    expect(manager.split(splitObject.name)).toBe(null); // If the factory/client is destroyed, `manager.split(validName)` will return null either way since the storage is not valid.
    expect(manager.splits()).toEqual([]); // If the factory/client is destroyed, `manager.splits()` will return empty array either way since the storage is not valid.
    expect(manager.names()).toEqual([]); // If the factory/client is destroyed, `manager.names()` will return empty array either way since the storage is not valid.
  });

});
