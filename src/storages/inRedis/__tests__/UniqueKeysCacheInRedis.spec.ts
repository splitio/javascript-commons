//@ts-nocheck

import Redis from 'ioredis';
import { UniqueKeysCacheInRedis } from '../UniqueKeysCacheInRedis';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { RedisMock } from '../../../utils/redis/RedisMock';

describe('UNIQUE KEYS CACHE IN REDIS', () => {
  const key = 'unique_key_post';

  test('should incrementally store values, clear the queue, and tell if it is empty', async () => {
    const connection = new Redis();

    const cache = new UniqueKeysCacheInRedis(loggerMock, key, connection);

    // queue is initially empty
    expect(cache.pop()).toEqual({ keys: [] });
    expect(cache.isEmpty()).toBe(true);

    cache.track('key1', 'feature1');
    cache.track('key2', 'feature2');
    cache.track('key1', 'feature3');

    expect(cache.isEmpty()).toBe(false);
    expect(cache.pop()).toEqual({
      keys: [
        {
          f: 'feature1',
          ks: ['key1']
        },
        {
          f: 'feature2',
          ks: ['key2']
        },
        {
          f: 'feature3',
          ks: ['key1']
        }
      ]
    }); // all the items should be stored in sequential order
    expect(cache.isEmpty()).toBe(true);

    // should empty the queue
    cache.track('key4', 'feature4');
    cache.clear();
    expect(cache.pop()).toEqual({ keys: [] });
    expect(cache.isEmpty()).toBe(true);

    await connection.quit();
  });

  test('Should call "onFullQueueCb" when the queue is full.', async () => {
    let cbCalled = 0;
    const connection = new Redis();

    const cache = new UniqueKeysCacheInRedis(loggerMock, key, connection, 3); // small uniqueKeysCache size to be reached
    cache.setOnFullQueueCb(() => { cbCalled++; cache.clear(); });

    cache.track('key1', 'feature1');
    cache.track('key1', 'feature1');
    expect(cbCalled).toBe(0); // if the storage is not full, it will not run the callback.
    cache.track('key1', 'feature1');
    expect(cbCalled).toBe(0); // the storage should just have the pair key1 - feature1
    cache.track('key1', 'feature2');
    expect(cbCalled).toBe(0); // storage: {key1: [feature1, feature2]} size: 2
    cache.track('key2', 'feature3');
    expect(cbCalled).toBe(1); // storage: {key1: [feature1, feature2], key2: [feature3]} size: 3 FLUSH!
    cache.track('key2', 'feature4');
    expect(cbCalled).toBe(1); // it should not flush again
    cache.track('key2', 'feature4');
    expect(cbCalled).toBe(1); // And it should not flush again,
    cache.track('key3', 'feature5');
    expect(cbCalled).toBe(1); // And it should not flush again,
    cache.track('key2', 'feature6');
    expect(cbCalled).toBe(2); // Until the queue is filled with events again.

    await connection.del(key);
    await connection.quit();
  });

  test('post unique keys in redis method', async () => {
    const connection = new Redis();

    const cache = new UniqueKeysCacheInRedis(loggerMock, key, connection, 20);
    cache.track('key1', 'feature1');
    cache.track('key2', 'feature2');
    cache.track('key1', 'feature3');
    cache.track('key2', 'feature3');

    await cache.postUniqueKeysInRedis();

    connection.lrange(key, 0, 10, async (err, data) => {
      const expected = [
        JSON.stringify({ 'f': 'feature1', 'ks': ['key1'] }),
        JSON.stringify({ 'f': 'feature2', 'ks': ['key2'] }),
        JSON.stringify({ 'f': 'feature3', 'ks': ['key1', 'key2'] })
      ];

      expect(data).toStrictEqual(expected);

      await connection.del(key);
      await connection.quit();
    });
  });

  test('start and stop task', (done) => {
    const connection = new RedisMock();
    const key = 'unique_key_post';
    const refreshRate = 100;

    const cache = new UniqueKeysCacheInRedis(loggerMock, key, connection, undefined, refreshRate);
    cache.track('key1', 'feature1');
    cache.track('key2', 'feature2');
    cache.track('key1', 'feature3');
    cache.track('key2', 'feature3');

    expect(connection.rpush).not.toBeCalled();

    cache.start();
    expect(cache.isEmpty()).toBe(false);

    setTimeout(() => {
      expect(connection.rpush).toBeCalledTimes(1);
      expect(cache.isEmpty()).toBe(true);

      cache.stop();
      expect(connection.rpush).toBeCalledTimes(1); // Stopping when cache is empty, does not call the wrapper
      cache.track('key3', 'feature4');
    }, refreshRate + 30);

    setTimeout(() => {
      expect(connection.rpush).toBeCalledTimes(1);
      expect(cache.isEmpty()).toBe(false);
      cache.start();
      cache.stop().then(() => {
        expect(connection.rpush).toBeCalledTimes(2); // Stopping when cache is not empty, calls the wrapper
        expect(connection.rpush.mock.calls).toEqual([
          [key, [JSON.stringify({ f: 'feature1', ks: ['key1'] }), JSON.stringify({ f: 'feature2', ks: ['key2'] }), JSON.stringify({ f: 'feature3', ks: ['key1', 'key2'] })]],
          [key, [JSON.stringify({ f: 'feature4', ks: ['key3'] })]]
        ]);
        expect(cache.isEmpty()).toBe(true);
        done();
      }, refreshRate + 30);
    }, 2 * refreshRate + 30);
  });

  test('Should call "onFullQueueCb" when the queue is full. "popNRaw" should pop items.', async () => {
    const connection = new Redis();

    const cache = new UniqueKeysCacheInRedis(loggerMock, key, connection, 3);

    cache.track('key1', 'feature1');
    cache.track('key1', 'feature1');
    cache.track('key1', 'feature1');
    connection.lrange(key, 0, 10, (err, data) => {
      expect(data).toStrictEqual([]);
    });
    cache.track('key1', 'feature2');
    cache.track('key2', 'feature3');

    const expected1 = [
      JSON.stringify({ 'f': 'feature1', 'ks': ['key1'] }),
      JSON.stringify({ 'f': 'feature2', 'ks': ['key1'] }),
      JSON.stringify({ 'f': 'feature3', 'ks': ['key2'] })
    ];

    let data = await connection.lrange(key, 0, 10);
    expect(data).toStrictEqual(expected1);

    cache.track('key2', 'feature4');
    cache.track('key2', 'feature4');
    cache.track('key3', 'feature5');
    cache.track('key2', 'feature6');

    // Validate `popNRaw` method
    let poped = await cache.popNRaw(2); // pop two items
    expect(poped).toEqual([{ f: 'feature1', ks: ['key1'] }, { f: 'feature2', ks: ['key1'] }]);
    poped = await cache.popNRaw(); // pop remaining items
    expect(poped).toEqual([{ f: 'feature3', ks: ['key2'] }, { f: 'feature4', ks: ['key2'] }, { f: 'feature5', ks: ['key3'] }, { f: 'feature6', ks: ['key2'] }]);
    poped = await cache.popNRaw(100); // try to pop more items when the queue is empty
    expect(poped).toEqual([]);

    data = await connection.lrange(key, 0, 10);
    expect(data).toStrictEqual([]);

    await connection.del(key);
    await connection.quit();
  });
});
