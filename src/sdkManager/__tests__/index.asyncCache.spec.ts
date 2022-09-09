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

// @ts-expect-error
const sdkReadinessManagerMock = {
  readinessManager: {
    isReady: jest.fn(() => true),
    isDestroyed: jest.fn(() => false)
  },
  sdkStatus: jest.fn()
} as ISdkReadinessManager;

// @ts-expect-error
const keys = new KeyBuilderSS();

describe('MANAGER API', () => {

  afterEach(() => { loggerMock.mockClear(); });

  test('Async cache (In Redis)', async () => {

    /** Setup: create manager */
    const connection = new Redis({});
    const cache = new SplitsCacheInRedis(loggerMock, keys, connection);
    const manager = sdkManagerFactory(loggerMock, cache, sdkReadinessManagerMock);
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
    await connection.quit();
  });

  test('Async cache with error', async () => {
    // passing an empty object as wrapper, to make method calls of splits cache fail returning a rejected promise.
    // @ts-expect-error
    const cache = new SplitsCachePluggable(loggerMock, keys, wrapperAdapter(loggerMock, {}));
    const manager = sdkManagerFactory(loggerMock, cache, sdkReadinessManagerMock);

    expect(await manager.split('some_spplit')).toEqual(null);
    expect(await manager.splits()).toEqual([]);
    expect(await manager.names()).toEqual([]);

    expect(loggerMock.error).toBeCalledTimes(3); // 3 error logs, one for each attempt to call a wrapper method
  });

});
