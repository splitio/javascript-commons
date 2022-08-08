// @ts-nocheck
import { UniqueKeysCacheInMemory } from '../uniqueKeysCacheInMemory';

test('UNIQUE KEYS CACHE IN MEMORY / should incrementally store values, clear the queue, and tell if it is empty', () => {
  const c = new UniqueKeysCacheInMemory();
  
  // queue is initially empty
  expect(c.pop()).toEqual({keys:[]});
  expect(c.isEmpty()).toBe(true);

  c.track('key1', 'value1');
  c.track('key2', 'value2');
  c.track('key1', 'value3');

  expect(c.isEmpty()).toBe(false);
  expect(c.pop()).toEqual({
    keys: [
      {
        f: 'value1',
        ks: ['key1']
      },
      {
        f: 'value2',
        ks: ['key2']
      },
      {
        f: 'value3',
        ks: ['key1']
      }
    ]
  }); // all the items should be stored in sequential order
  expect(c.isEmpty()).toBe(true);

  // should empty the queue
  c.track('key4', 'value4');
  c.clear();
  expect(c.pop()).toEqual({ keys: [] });
  expect(c.isEmpty()).toBe(true);
});

test('UNIQUE KEYS CACHE IN MEMORY / Should call "onFullQueueCb" when the queue is full.', () => {
  let cbCalled = 0;
  const cache = new UniqueKeysCacheInMemory(3); // small uniqueKeysCache size to be reached
  cache.setOnFullQueueCb(() => { cbCalled++; cache.clear(); });

  cache.track('key1', 'value1');
  cache.track('key1', 'value1');
  expect(cbCalled).toBe(0); // if the storage is not full, it will not run the callback.
  cache.track('key1', 'value1');
  expect(cbCalled).toBe(0); // the storage should just have the pair key1 - value1
  cache.track('key1', 'value2');
  expect(cbCalled).toBe(0); // storage: {key1: [value1, value2]} size: 2
  cache.track('key2', 'value3');
  expect(cbCalled).toBe(1); // storage: {key1: [value1, value2], key2: [value3]} size: 3 FLUSH!
  cache.track('key2', 'value4');
  expect(cbCalled).toBe(1); // it should not flush again
  cache.track('key2', 'value4');
  expect(cbCalled).toBe(1); // And it should not flush again,
  cache.track('key3', 'value5');
  expect(cbCalled).toBe(1); // And it should not flush again,
  cache.track('key2', 'value6');
  expect(cbCalled).toBe(2); // Until the queue is filled with events again.
});

test('UNIQUE KEYS CACHE IN MEMORY / Should not throw if the "onFullQueueCb" callback was not provided.', () => {
  const cache = new UniqueKeysCacheInMemory(3); // small eventsQueueSize to be reached

  cache.track('key1', 'value1');
  cache.track('key1', 'value2'); // Cache still not full,
  expect(cache.track.bind(cache, 'key2', 'value3')).not.toThrow(); // but when it is full, as 'onFullQueueCb' was not provided, nothing happens but no exceptions are thrown.
  expect(cache.track.bind(cache, 'key3', 'value4')).not.toThrow(); // but when it is full, as 'onFullQueueCb' was not provided, nothing happens but no exceptions are thrown.
});
