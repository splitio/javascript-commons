
import KeyBuilderSS from '../../KeyBuilderSS';
import { ImpressionsCachePluggable } from '../ImpressionsCachePluggable';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { wrapperMock } from './wrapper.mock';
import { IRedisMetadata } from '../../../dtos/types';

const prefix = 'impr_cache_ut';
const impressionsKey = `${prefix}.impressions`;
const testMeta: IRedisMetadata = { i: 'some_ip', n: 'some_host', s: 'some_sdk_version' }; // @ts-ignore
const keys = new KeyBuilderSS(prefix, testMeta);

const o1 = {
  feature: 'test1',
  keyName: 'facundo@split.io',
  treatment: 'on',
  time: Date.now(),
  label: 'default rule',
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
  label: 'default rule',
  changeNumber: 1
};

describe('PLUGGABLE IMPRESSIONS CACHE', () => {

  afterEach(() => {
    loggerMock.mockClear();
    wrapperMock.mockClear();
  });

  test('`track` method should push values into the pluggable storage', async () => {
    const cache = new ImpressionsCachePluggable(loggerMock, keys, wrapperMock, testMeta);

    expect(await cache.track([o1])).toBe(true); // result should resolve to true

    let state = wrapperMock._cache[impressionsKey];
    expect(state.length).toBe(1); // impression should be stored

    expect(await cache.track([o2, o3])).toBe(true);

    state = wrapperMock._cache[impressionsKey];
    expect(state.length).toBe(3);
    // This is testing both the track and the toJSON method.
    expect(state[0]).toBe(JSON.stringify({
      m: testMeta,
      i: { k: o1.keyName, f: o1.feature, t: o1.treatment, r: o1.label, c: o1.changeNumber, m: o1.time }
    }));
    expect(state[1]).toBe(JSON.stringify({
      m: testMeta,
      i: { k: o2.keyName, b: o2.bucketingKey, f: o2.feature, t: o2.treatment, r: o2.label, c: o2.changeNumber, m: o2.time }
    }));
    expect(state[2]).toBe(JSON.stringify({
      m: testMeta,
      i: { k: o3.keyName, f: o3.feature, t: o3.treatment, r: o3.label, c: o3.changeNumber, m: o3.time }
    }));

  });

  test('`track` method result should not reject if wrapper operation fails', async () => {
    // make wrapper operation fail
    wrapperMock.pushItems.mockImplementation(() => Promise.reject());
    const cache = new ImpressionsCachePluggable(loggerMock, keys, wrapperMock, testMeta);

    expect(await cache.track([o1])).toBe(false); // result should resolve to false
  });

});
