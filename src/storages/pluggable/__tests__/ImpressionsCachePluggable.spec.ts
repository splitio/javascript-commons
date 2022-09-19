import { ImpressionsCachePluggable } from '../ImpressionsCachePluggable';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { wrapperMock } from './wrapper.mock';
import { metadata } from '../../__tests__/KeyBuilder.spec';

const prefix = 'impr_cache_ut';
const impressionsKey = `${prefix}.impressions`;

const o1 = {
  feature: 'test1',
  keyName: 'facundo@split.io',
  treatment: 'on',
  time: Date.now(),
  label: 'default rule',
  changeNumber: 1
};

const o1stored = {
  m: metadata,
  i: { k: o1.keyName, f: o1.feature, t: o1.treatment, r: o1.label, c: o1.changeNumber, m: o1.time }
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

const o2stored = {
  m: metadata,
  i: { k: o2.keyName, b: o2.bucketingKey, f: o2.feature, t: o2.treatment, r: o2.label, c: o2.changeNumber, m: o2.time }
};

const o3 = {
  feature: 'test3',
  keyName: 'pipiip@split.io',
  treatment: 'B',
  time: Date.now(),
  label: 'default rule',
  changeNumber: 1
};

const o3stored = {
  m: metadata,
  i: { k: o3.keyName, f: o3.feature, t: o3.treatment, r: o3.label, c: o3.changeNumber, m: o3.time }
};

export { metadata, o1, o2, o3, o1stored, o2stored, o3stored };

describe('PLUGGABLE IMPRESSIONS CACHE', () => {

  afterEach(() => {
    loggerMock.mockClear();
    wrapperMock.mockClear();
  });

  test('`track`, `count`, `popNWithMetadata` and `drop` methods', async () => {
    const cache = new ImpressionsCachePluggable(loggerMock, impressionsKey, wrapperMock, metadata);

    // Testing track and count methods.
    await cache.track([o1]);
    let state = wrapperMock._cache[impressionsKey] as string[];
    expect(state.length).toBe(1); // impression should be stored
    expect(await cache.count()).toBe(1); // count should return stored items

    await cache.track([o2, o3]);
    state = wrapperMock._cache[impressionsKey] as string[];
    expect(state.length).toBe(3);
    expect(await cache.count()).toBe(3); // count should return stored items

    // Testing popNWithMetadata and private toJSON methods.
    expect(await cache.popNWithMetadata(2)).toEqual([o1stored, o2stored]); // impressions are removed in FIFO order
    expect(await cache.count()).toBe(1);

    expect(await cache.popNWithMetadata(1)).toEqual([o3stored]);
    expect(await cache.count()).toBe(0);
    expect(await cache.popNWithMetadata(100)).toEqual([]); // no more impressions

    // Testing drop method
    await cache.track([o1, o2, o3]);
    expect(await cache.count()).toBe(3);
    await cache.drop();
    expect(await cache.count()).toBe(0); // storage should be empty after dropping it

  });

  test('`track` method rejects if wrapper operation fails', (done) => {
    // make wrapper operation fail
    wrapperMock.pushItems.mockImplementation(() => Promise.reject());
    const cache = new ImpressionsCachePluggable(loggerMock, impressionsKey, wrapperMock, metadata);

    cache.track([o1]).catch(done); // result should rejects
  });

});
