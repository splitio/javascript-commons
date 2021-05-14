import Redis from 'ioredis';
import find from 'lodash/find';
import isEqual from 'lodash/isEqual';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import EventsCacheInRedis from '../EventsCacheInRedis';

const prefix = 'events_cache_ut';
const eventsKey = `${prefix}.impressions`;
const fakeMetadata = { s: 'js_someversion', i: 'some_ip', n: 'some_hostname' };

test('EVENTS CACHE IN REDIS / should incrementally store values in redis', async () => {
  const connection = new Redis();

  const fakeEvent1 = { event: 1 };
  const fakeEvent2 = { event: '2' };
  const fakeEvent3 = { event: null };

  // Clean up in case there are still keys there.
  await connection.del(eventsKey);

  let redisValues = await connection.lrange(eventsKey, 0, -1);

  expect(redisValues.length).toBe(0); // control assertion, there are no events previously queued.

  const cache = new EventsCacheInRedis(loggerMock, eventsKey, connection, fakeMetadata);
  // I'll use a "bad" instance so I can force an issue with the rpush command. I'll store an integer and will make the cache try to use rpush there.
  await connection.set('non-list-key', 10);

  const faultyCache = new EventsCacheInRedis(loggerMock, 'non-list-key', connection, fakeMetadata);

  // @ts-expect-error
  expect(await cache.track(fakeEvent1)).toBe(true); // If the queueing operation was successful, it should resolve the returned promise with "true"
  // @ts-expect-error
  expect(await cache.track(fakeEvent2)).toBe(true); // If the queueing operation was successful, it should resolve the returned promise with "true"
  // @ts-expect-error
  expect(await cache.track(fakeEvent3)).toBe(true); // If the queueing operation was successful, it should resolve the returned promise with "true"
  // @ts-expect-error
  expect(await faultyCache.track(fakeEvent1)).toBe(false); // If the queueing operation was NOT successful, it should resolve the returned promise with "false" instead of rejecting it.
  // @ts-expect-error
  expect(await faultyCache.track(fakeEvent2)).toBe(false); // If the queueing operation was NOT successful, it should resolve the returned promise with "false" instead of rejecting it.
  // @ts-expect-error
  expect(await faultyCache.track(fakeEvent3)).toBe(false); // If the queueing operation was NOT successful, it should resolve the returned promise with "false" instead of rejecting it.

  redisValues = await connection.lrange(eventsKey, 0, -1);

  expect(redisValues.length).toBe(3); // After pushing we should have on Redis as many events as we have stored.
  expect(typeof redisValues[0]).toBe('string'); // All elements should be strings since those are stringified JSONs.
  expect(typeof redisValues[1]).toBe('string'); // All elements should be strings since those are stringified JSONs.
  expect(typeof redisValues[2]).toBe('string'); // All elements should be strings since those are stringified JSONs.

  const findMatchingElem = (event: any) => {
    return find(redisValues, elem => {
      const parsedElem = JSON.parse(elem);
      return isEqual(parsedElem.e, event) && isEqual(parsedElem.m, fakeMetadata);
    });
  };

  /* If the elements are found, then the values are correct. */
  const foundEv1 = findMatchingElem(fakeEvent1);
  const foundEv2 = findMatchingElem(fakeEvent2);
  const foundEv3 = findMatchingElem(fakeEvent3);
  expect(foundEv1).not.toBe(undefined); // Events stored on redis matched the values we are expecting.
  expect(foundEv2).not.toBe(undefined); // Events stored on redis matched the values we are expecting.
  expect(foundEv3).not.toBe(undefined); // Events stored on redis matched the values we are expecting.

  // Clean up then end.
  await connection.del(eventsKey);
  await connection.quit();
});
