import { UniqueKeysCachePluggable } from '../UniqueKeysCachePluggable';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { wrapperMock } from './wrapper.mock';

describe('UNIQUE KEYS CACHE PLUGGABLE', () => {
  const key = 'unique_key_post';

  afterEach(() => {
    wrapperMock.mockClear();
  });

  test('"start" and "stop" methods', (done) => {
    const refreshRate = 100;
    const cache = new UniqueKeysCachePluggable(loggerMock, key, wrapperMock, undefined, refreshRate);

    cache.track('key1', 'feature1');
    cache.track('key2', 'feature2');
    cache.track('key1', 'feature3');
    cache.track('key2', 'feature3');

    expect(wrapperMock.pushItems).not.toBeCalled();

    cache.start();
    expect(cache.isEmpty()).toBe(false);

    setTimeout(() => {
      expect(wrapperMock.pushItems).toBeCalledTimes(1);
      expect(cache.isEmpty()).toBe(true);

      cache.stop();
      expect(wrapperMock.pushItems).toBeCalledTimes(1); // Stopping when cache is empty, does not call the wrapper
      cache.track('key3', 'feature4');
    }, refreshRate + 20);

    setTimeout(() => {
      expect(wrapperMock.pushItems).toBeCalledTimes(1);
      expect(cache.isEmpty()).toBe(false);
      cache.start();
      cache.stop().then(() => {
        expect(wrapperMock.pushItems).toBeCalledTimes(2); // Stopping when cache is not empty, calls the wrapper
        expect(wrapperMock.pushItems.mock.calls).toEqual([
          [key, [JSON.stringify({ f: 'feature1', ks: ['key1'] }), JSON.stringify({ f: 'feature2', ks: ['key2'] }), JSON.stringify({ f: 'feature3', ks: ['key1', 'key2'] })]],
          [key, [JSON.stringify({ f: 'feature4', ks: ['key3'] })]]
        ]);
        expect(cache.isEmpty()).toBe(true);
        done();
      });
    }, 2 * refreshRate + 20);
  });

  test('Should call "onFullQueueCb" when the queue is full. "popNRaw" should pop items.', async () => {
    const key = 'other_key';
    const cache = new UniqueKeysCachePluggable(loggerMock, key, wrapperMock, 3);

    cache.track('key1', 'feature1');
    cache.track('key1', 'feature1');
    cache.track('key1', 'feature1');

    expect(wrapperMock.pushItems).not.toBeCalled();
    expect(cache.isEmpty()).toBe(false);

    cache.track('key1', 'feature2');
    cache.track('key2', 'feature3');

    // Wrapper operations are called asynchronously
    await new Promise(resolve => setTimeout(resolve));

    expect(wrapperMock.pushItems.mock.calls).toEqual([
      [key, [JSON.stringify({ f: 'feature1', ks: ['key1'] }), JSON.stringify({ f: 'feature2', ks: ['key1'] }), JSON.stringify({ f: 'feature3', ks: ['key2'] })]]
    ]);

    expect(cache.isEmpty()).toBe(true);

    // Validate `popNRaw` method
    let poped = await cache.popNRaw(2); // pop two items
    expect(poped).toEqual([{ f: 'feature1', ks: ['key1'] }, { f: 'feature2', ks: ['key1'] }]);
    poped = await cache.popNRaw(); // pop remaining items
    expect(poped).toEqual([{ f: 'feature3', ks: ['key2'] }]);
    poped = await cache.popNRaw(100); // try to pop more items when the queue is empty
    expect(poped).toEqual([]);
  });
});
