import Redis from 'ioredis';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import EventsCacheInRedis from '../EventsCacheInRedis';
import { fakeMetadata, fakeEvent1, fakeEvent1stored, fakeEvent2, fakeEvent2stored, fakeEvent3, fakeEvent3stored } from '../../pluggable/__tests__/EventsCachePluggable.spec';

const prefix = 'events_cache_ut';
const eventsKey = `${prefix}.events`;
const nonListKey = 'non-list-key';

test('EVENTS CACHE IN REDIS / `track`, `count`, `popNWithMetadata` and `drop` methods', async () => {
  const connection = new Redis();

  // Clean up in case there are still keys there.
  await connection.del(eventsKey);

  let redisValues = await connection.lrange(eventsKey, 0, -1);

  expect(redisValues.length).toBe(0); // control assertion, there are no events previously queued.

  const cache = new EventsCacheInRedis(loggerMock, eventsKey, connection, fakeMetadata);
  // I'll use a "bad" instance so I can force an issue with the rpush command. I'll store an integer and will make the cache try to use rpush there.
  await connection.set(nonListKey, 10);

  const faultyCache = new EventsCacheInRedis(loggerMock, nonListKey, connection, fakeMetadata);

  expect(await cache.track(fakeEvent1)).toBe(true); // If the queueing operation was successful, it should resolve the returned promise with "true"
  expect(await cache.track(fakeEvent2)).toBe(true); // If the queueing operation was successful, it should resolve the returned promise with "true"
  expect(await cache.track(fakeEvent3)).toBe(true); // If the queueing operation was successful, it should resolve the returned promise with "true"
  expect(await faultyCache.track(fakeEvent1)).toBe(false); // If the queueing operation was NOT successful, it should resolve the returned promise with "false" instead of rejecting it.
  expect(await faultyCache.track(fakeEvent2)).toBe(false); // If the queueing operation was NOT successful, it should resolve the returned promise with "false" instead of rejecting it.
  expect(await faultyCache.track(fakeEvent3)).toBe(false); // If the queueing operation was NOT successful, it should resolve the returned promise with "false" instead of rejecting it.

  // Events should be in redis
  redisValues = await connection.lrange(eventsKey, 0, -1);
  expect(redisValues.length).toBe(3); // After pushing we should have on Redis as many events as we have stored.
  expect(typeof redisValues[0]).toBe('string'); // All elements should be strings since those are stringified JSONs.
  expect(typeof redisValues[1]).toBe('string'); // All elements should be strings since those are stringified JSONs.
  expect(typeof redisValues[2]).toBe('string'); // All elements should be strings since those are stringified JSONs.

  // Testing popNWithMetadata
  expect(await cache.popNWithMetadata(2)).toEqual([fakeEvent1stored, fakeEvent2stored]); // events are removed in FIFO order
  expect(await cache.count()).toBe(1);

  expect(await cache.popNWithMetadata(1)).toEqual([fakeEvent3stored]);
  expect(await cache.count()).toBe(0);

  expect(await cache.popNWithMetadata(100)).toEqual([]); // no more events

  // Testing drop method
  await Promise.all([cache.track(fakeEvent1), cache.track(fakeEvent2), cache.track(fakeEvent3)]);
  expect(await cache.count()).toBe(3);
  await cache.drop();
  expect(await cache.count()).toBe(0); // storage should be empty after droping it

  // Clean up then end.
  await connection.del(eventsKey, nonListKey);
  await connection.quit();
});
