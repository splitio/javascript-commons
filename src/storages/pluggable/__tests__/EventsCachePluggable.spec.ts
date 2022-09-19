import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { EventsCachePluggable } from '../EventsCachePluggable';
import { wrapperMockFactory } from './wrapper.mock';
import { wrapperAdapter } from '../wrapperAdapter';
import { metadata } from '../../__tests__/KeyBuilder.spec';

const prefix = 'events_cache_ut';
const eventsKey = `${prefix}.events`;

const fakeEvent1 = { eventTypeId: '1', timestamp: 111 };
const fakeEvent1stored = { m: metadata, e: fakeEvent1 };

const fakeEvent2 = { eventTypeId: '2', timestamp: 222 };
const fakeEvent2stored = { m: metadata, e: fakeEvent2 };

const fakeEvent3 = { eventTypeId: '3', timestamp: 333 };
const fakeEvent3stored = { m: metadata, e: fakeEvent3 };

export { metadata, fakeEvent1, fakeEvent1stored, fakeEvent2, fakeEvent2stored, fakeEvent3, fakeEvent3stored };

describe('PLUGGABLE EVENTS CACHE', () => {

  test('`track`, `count`, `popNWithMetadata` and `drop` methods', async () => {
    const wrapperMock = wrapperMockFactory();
    const cache = new EventsCachePluggable(loggerMock, eventsKey, wrapperMock, metadata);

    // Testing track and count methods.
    expect(await cache.track(fakeEvent1)).toBe(true); // If the queueing operation was successful, it should resolve the returned promise with "true"
    expect(await cache.count()).toBe(1); // count should return stored items
    expect(await cache.track(fakeEvent2)).toBe(true); // If the queueing operation was successful, it should resolve the returned promise with "true"
    expect(await cache.track(fakeEvent3)).toBe(true); // If the queueing operation was successful, it should resolve the returned promise with "true"
    expect(await cache.count()).toBe(3); // count should return stored items

    const values = wrapperMock._cache[eventsKey] as string[];
    expect(values.length).toBe(3); // After pushing we should have events in the wrapper.

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
    expect(await cache.count()).toBe(0); // storage should be empty after dropping it

    wrapperMock.mockClear();
  });

  test('`track` method result should not reject if wrapper operation fails', async () => {
    const wrapperMock = wrapperMockFactory();
    // @ts-ignore. I'll use a "bad" queue to force an exception with the pushItems wrapper operation.
    wrapperMock._cache['non-list-key'] = 10;
    // wrapperMock is adapted this time to properly handle unexpected exceptions
    const faultyCache = new EventsCachePluggable(loggerMock, 'non-list-key', wrapperAdapter(loggerMock, wrapperMock), metadata);

    expect(await faultyCache.track(fakeEvent1)).toBe(false); // If the queueing operation was NOT successful, it should resolve the returned promise with "false" instead of rejecting it.
    expect(await faultyCache.track(fakeEvent2)).toBe(false); // If the queueing operation was NOT successful, it should resolve the returned promise with "false" instead of rejecting it.
    expect(await faultyCache.track(fakeEvent3)).toBe(false); // If the queueing operation was NOT successful, it should resolve the returned promise with "false" instead of rejecting it.

    wrapperMock.mockClear();
  });

});
