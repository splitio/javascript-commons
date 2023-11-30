import Redis from 'ioredis';
import splitObject from './mocks/input.json';
import splitView from './mocks/output.json';
import { sdkManagerFactory } from '../index';
import { SplitsCacheInRedis } from '../../storages/inRedis/SplitsCacheInRedis';
import { SplitsCachePluggable } from '../../storages/pluggable/SplitsCachePluggable';
import { wrapperAdapter } from '../../storages/pluggable/wrapperAdapter';
import { KeyBuilderSS } from '../../storages/KeyBuilderSS';
import { ISdkReadinessManager } from '../../readiness/types';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';
import { metadata } from '../../storages/__tests__/KeyBuilder.spec';
import { SplitIO } from '../../types';

// @ts-expect-error
const sdkReadinessManagerMock = {
  readinessManager: {
    isReady: jest.fn(() => true),
    isDestroyed: jest.fn(() => false)
  },
  sdkStatus: jest.fn()
} as ISdkReadinessManager;

const keys = new KeyBuilderSS('prefix', metadata);

describe('Manager with async cache', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('returns the expected data from the cache', async () => {

    /** Setup: create manager */
    const connection = new Redis({});
    const cache = new SplitsCacheInRedis(loggerMock, keys, connection);
    const manager = sdkManagerFactory({ mode: 'consumer', log: loggerMock }, cache, sdkReadinessManagerMock);
    await cache.clear();
    await cache.addSplit(splitObject.name, splitObject as any);

    /** List all splits */
    const views = await manager.splits();
    expect(views[0]).toEqual(splitView);

    /** Read only one split by name */

    const split = await manager.split(splitObject.name);
    expect(split).toEqual(splitView);

    /** List all the split names */

    const names = await manager.names();
    expect(names.indexOf(splitObject.name) !== -1).toBe(true);

    /** Input Validation */

    // control assertions to verify that the manager is connected with that cache.
    expect((await manager.split(splitObject.name)) != null).toBe(true); // control assertion for split.
    expect((await manager.splits()).length > 0).toBe(true); // control assertion for splits.
    expect((await manager.names()).length > 0).toBe(true); // control assertion for names.

    // @ts-expect-error
    expect(await manager.split(undefined)).toBe(null); // If the split name is invalid, `manager.split(invalidName)` returns null.

    // This is kind of tied to the implementation of the isOperational validator.
    (sdkReadinessManagerMock.readinessManager.isDestroyed as jest.Mock).mockImplementation(() => true);

    expect(await manager.split(splitObject.name)).toBe(null); // If the factory/client is destroyed, `manager.split(validName)` will return null either way since the storage is not valid.
    expect(await manager.splits()).toEqual([]); // If the factory/client is destroyed, `manager.splits()` will return empty array either way since the storage is not valid.
    expect(await manager.names()).toEqual([]); // If the factory/client is destroyed, `manager.names()` will return empty array either way since the storage is not valid.

    /** Teardown */
    await cache.removeSplit(splitObject.name);
    await connection.disconnect();
  });

  test('handles storage errors', async () => {
    // passing an empty object as wrapper, to make method calls of splits cache fail returning a rejected promise.
    // @ts-expect-error
    const cache = new SplitsCachePluggable(loggerMock, keys, wrapperAdapter(loggerMock, {}));
    const manager = sdkManagerFactory({ mode: 'consumer_partial', log: loggerMock }, cache, sdkReadinessManagerMock);

    expect(await manager.split('some_spplit')).toEqual(null);
    expect(await manager.splits()).toEqual([]);
    expect(await manager.names()).toEqual([]);

    expect(loggerMock.error).toBeCalledTimes(3); // 3 error logs, one for each attempt to call a wrapper method
  });

  test('returns empty results when not operational', async () => {
    // SDK is flagged as destroyed
    const sdkReadinessManagerMock = {
      readinessManager: {
        isReady: () => true,
        isReadyFromCache: () => true,
        isDestroyed: () => true
      },
      sdkStatus: {}
    };
    // @ts-expect-error
    const manager = sdkManagerFactory({ mode: 'consumer_partial', log: loggerMock }, {}, sdkReadinessManagerMock) as SplitIO.IAsyncManager;

    function validateManager() {
      expect(manager.split('some_spplit')).resolves.toBe(null);
      expect(manager.splits()).resolves.toEqual([]);
      expect(manager.names()).resolves.toEqual([]);
    }

    validateManager();

    // SDK is not ready
    sdkReadinessManagerMock.readinessManager.isReady = () => false;
    sdkReadinessManagerMock.readinessManager.isReadyFromCache = () => false;
    sdkReadinessManagerMock.readinessManager.isDestroyed = () => false;

    validateManager();
  });

});
