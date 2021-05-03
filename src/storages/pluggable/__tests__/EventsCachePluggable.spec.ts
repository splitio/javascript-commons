import find from 'lodash/find';
import isEqual from 'lodash/isEqual';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import KeyBuilderSS from '../../KeyBuilderSS';
import { EventsCachePluggable } from '../EventsCachePluggable';
import { wrapperMockFactory } from './wrapper.mock';
import { wrapperAdapter } from '../wrapperAdapter';

const prefix = 'events_cache_ut';
const fakeMetadata = { s: 'js_someversion', i: 'some_ip', n: 'some_hostname' };
const keys = new KeyBuilderSS(prefix, fakeMetadata);
const key = keys.buildEventsKey();

const fakeEvent1 = { event: 1 };
const fakeEvent2 = { event: '2' };
const fakeEvent3 = { event: null };

describe('PLUGGABLE EVENTS CACHE', () => {

  test('`track` method should push values into the pluggable storage', async () => {
    const wrapperMock = wrapperMockFactory();
    const cache = new EventsCachePluggable(loggerMock, keys, wrapperMock, fakeMetadata);

    // @ts-expect-error
    expect(await cache.track(fakeEvent1)).toBe(true); // If the queueing operation was successful, it should resolve the returned promise with "true"
    // @ts-expect-error
    expect(await cache.track(fakeEvent2)).toBe(true); // If the queueing operation was successful, it should resolve the returned promise with "true"
    // @ts-expect-error
    expect(await cache.track(fakeEvent3)).toBe(true); // If the queueing operation was successful, it should resolve the returned promise with "true"

    const values = wrapperMock._cache[key];

    expect(values.length).toBe(3); // After pushing we should have as many events as we have stored.
    expect(typeof values[0]).toBe('string'); // All elements should be strings since those are stringified JSONs.
    expect(typeof values[1]).toBe('string'); // All elements should be strings since those are stringified JSONs.
    expect(typeof values[2]).toBe('string'); // All elements should be strings since those are stringified JSONs.

    const findMatchingElem = (event: any) => {
      return find(values, elem => {
        const parsedElem = JSON.parse(elem);
        return isEqual(parsedElem.e, event) && isEqual(parsedElem.m, fakeMetadata);
      });
    };

    /* If the elements are found, then the values are correct. */
    const foundEv1 = findMatchingElem(fakeEvent1);
    const foundEv2 = findMatchingElem(fakeEvent2);
    const foundEv3 = findMatchingElem(fakeEvent3);
    expect(foundEv1).not.toBe(undefined); // stored events matched the values we are expecting.
    expect(foundEv2).not.toBe(undefined); // stored events matched the values we are expecting.
    expect(foundEv3).not.toBe(undefined); // stored events matched the values we are expecting.

    wrapperMock.mockClear();
  });

  test('`track` method result should not reject if wrapper operation fails', async () => {
    const wrapperMock = wrapperMockFactory();
    // @ts-ignore. I'll use a "bad" queue to force an exception with the pushItems wrapper operation.
    wrapperMock._cache['non-list-key'] = 10;
    // @ts-expect-error. wrapperMock is adapted this time to properly handle unexpected exceptions
    const faultyCache = new EventsCachePluggable(loggerMock, {
      buildEventsKey: () => 'non-list-key'
    }, wrapperAdapter(loggerMock, wrapperMock), fakeMetadata);

    // @ts-expect-error
    expect(await faultyCache.track(fakeEvent1)).toBe(false); // If the queueing operation was NOT successful, it should resolve the returned promise with "false" instead of rejecting it.
    // @ts-expect-error
    expect(await faultyCache.track(fakeEvent2)).toBe(false); // If the queueing operation was NOT successful, it should resolve the returned promise with "false" instead of rejecting it.
    // @ts-expect-error
    expect(await faultyCache.track(fakeEvent3)).toBe(false); // If the queueing operation was NOT successful, it should resolve the returned promise with "false" instead of rejecting it.

    wrapperMock.mockClear();
  });

});
