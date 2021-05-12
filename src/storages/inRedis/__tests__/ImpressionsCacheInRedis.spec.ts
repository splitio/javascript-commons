import Redis from '../RedisAdapter';
import KeyBuilderSS from '../../KeyBuilderSS';
import ImpressionsCacheInRedis from '../ImpressionsCacheInRedis';
import IORedis, { BooleanResponse } from 'ioredis';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('IMPRESSIONS CACHE IN REDIS / should incrementally store values', async () => {
  const prefix = 'impr_cache_ut';
  const impressionsKey = `${prefix}.impressions`;
  const testMeta = { thisIsTheMeta: true };
  const connection = new Redis(loggerMock, {});
  // @ts-expect-error
  const keys = new KeyBuilderSS(prefix); // @ts-expect-error
  const c = new ImpressionsCacheInRedis(keys, connection, testMeta);

  const o1 = {
    feature: 'test1',
    keyName: 'facundo@split.io',
    treatment: 'on',
    time: Date.now(),
    changeNumber: 1
  };

  const o2 = {
    feature: 'test2',
    keyName: 'pepep@split.io',
    treatment: 'A',
    time: Date.now(),
    bucketingKey: '1234-5678',
    label: 'is in segment',
    changeNumber: 1
  };

  const o3 = {
    feature: 'test3',
    keyName: 'pipiip@split.io',
    treatment: 'B',
    time: Date.now(),
    changeNumber: 1
  };

  // cleanup
  await connection.del(impressionsKey);

  // @ts-expect-error
  await c.track([o1]); // @ts-expect-error
  await c.track([o2, o3]);
  const state = await connection.lrange(impressionsKey, 0, -1);
  // This is testing both the track and the toJSON method.
  expect(state[0]).toBe(JSON.stringify({
    m: testMeta,
    i: { k: o1.keyName, f: o1.feature, t: o1.treatment, c: o1.changeNumber, m: o1.time }
  }));
  expect(state[1]).toBe(JSON.stringify({
    m: testMeta,
    i: { k: o2.keyName, b: o2.bucketingKey, f: o2.feature, t: o2.treatment, r: o2.label, c: o2.changeNumber, m: o2.time }
  }));
  expect(state[2]).toBe(JSON.stringify({
    m: testMeta,
    i: { k: o3.keyName, f: o3.feature, t: o3.treatment, c: o3.changeNumber, m: o3.time }
  }));

  await connection.del(impressionsKey);
  await connection.quit();
});

test('IMPRESSIONS CACHE IN REDIS / should not resolve track before calling expire', async (done) => {
  const prefix = 'impr_cache_ut_2';
  const impressionsKey = `${prefix}.impressions`;
  const testMeta = { thisIsTheMeta: true };
  const connection = new Redis(loggerMock, {});
  // @ts-expect-error
  const keys = new KeyBuilderSS(prefix); // @ts-expect-error
  const c = new ImpressionsCacheInRedis(keys, connection, testMeta);

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
  c.track([i1, i2]).then(() => {
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
    done();
  });
});
