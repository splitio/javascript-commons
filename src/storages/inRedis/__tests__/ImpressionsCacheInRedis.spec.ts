import { RedisAdapter } from '../RedisAdapter';
import { ImpressionsCacheInRedis } from '../ImpressionsCacheInRedis';
import IORedis, { BooleanResponse } from 'ioredis';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { fakeMetadata, o1, o2, o3, o1stored, o2stored, o3stored } from '../../pluggable/__tests__/ImpressionsCachePluggable.spec';

describe('IMPRESSIONS CACHE IN REDIS', () => {

  test('`track`, `count`, `popNWithMetadata` and `drop` methods', async () => {
    const connection = new RedisAdapter(loggerMock, {});
    const impressionsKey = 'impr_cache_ut.impressions';

    const c = new ImpressionsCacheInRedis(loggerMock, impressionsKey, connection, fakeMetadata);

    // cleanup
    await connection.del(impressionsKey);

    // Testing track and count methods.
    await c.track([o1]);
    expect(await c.count()).toBe(1); // count should return stored items

    await c.track([o2, o3]);
    expect(await c.count()).toBe(3); // count should return stored items

    // Impressions should be in redis
    const state = await connection.lrange(impressionsKey, 0, -1);
    expect(state.length).toBe(3); // After pushing we should have on Redis as many impressions as we have stored.
    expect(state[0]).toBe(JSON.stringify(o1stored));
    expect(state[1]).toBe(JSON.stringify(o2stored));
    expect(state[2]).toBe(JSON.stringify(o3stored));

    // Testing popNWithMetadata and private toJSON methods.
    expect(await c.popNWithMetadata(2)).toEqual([o1stored, o2stored]); // impressions are removed in FIFO order
    expect(await c.count()).toBe(1);

    expect(await c.popNWithMetadata(1)).toEqual([o3stored]);
    expect(await c.count()).toBe(0);
    expect(await c.popNWithMetadata(100)).toEqual([]); // no more impressions

    // Testing drop method
    await c.track([o1, o2, o3]);
    expect(await c.count()).toBe(3);
    await c.drop();
    expect(await c.count()).toBe(0); // storage should be empty after dropping it

    await connection.del(impressionsKey);
    await connection.quit();
  });

  test('`track` should not resolve before calling expire', async () => {
    const impressionsKey = 'impr_cache_ut_2.impressions';
    const connection = new RedisAdapter(loggerMock, {});

    const c = new ImpressionsCacheInRedis(loggerMock, impressionsKey, connection, fakeMetadata);

    const i1 = { feature: 'test4', keyName: 'nicolas@split.io', treatment: 'off', time: Date.now(), changeNumber: 1 };
    const i2 = { feature: 'test5', keyName: 'matias@split.io', treatment: 'on', time: Date.now(), changeNumber: 2 };

    const spy1 = jest.spyOn(connection, 'rpush');
    const spy2 = jest.spyOn(connection, 'expire');

    // Crap so we can reproduce the latency as we would have on a remote server.
    const originalExpire = connection.expire;

    connection.expire = function patchedForTestRedisExpire(...args: [key: IORedis.KeyType, seconds: number]) {
      return new Promise<BooleanResponse>((res, rej) => {
        setTimeout(() => {
          originalExpire.apply(connection, args).then(res).catch(rej);
        }, 150); // 150ms of delay on the expire
      });
    };

    // cleanup prior to test.
    await connection.del(impressionsKey);

    // @ts-expect-error
    await c.track([i1, i2]).then(() => {
      connection.del(impressionsKey);
      connection.quit(); // Try to disconnect right away.
      expect(spy1).toBeCalled(); // Redis rpush was called once before executing external callback.
      // Following assertion fails if the expire takes place after disconnected and throws unhandledPromiseRejection
      expect(spy2).toBeCalled(); // Redis expire was called once before executing external callback.
    }).catch(e => {
      throw new Error(`An error was generated from the redis expire tests: ${e}`);
    }).then(() => {
      // Finally clean up and wrap up.
      spy1.mockRestore();
      spy2.mockRestore();
    });
  });

});
