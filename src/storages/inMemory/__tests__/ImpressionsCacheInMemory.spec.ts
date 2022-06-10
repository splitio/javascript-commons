// @ts-nocheck
import { ImpressionsCacheInMemory } from '../ImpressionsCacheInMemory';

test('IMPRESSIONS CACHE IN MEMORY / should incrementally store values, clear the queue, and tell if it is empty', () => {
  const c = new ImpressionsCacheInMemory();

  // queue is initially empty
  expect(c.pop()).toEqual([]);
  expect(c.isEmpty()).toBe(true);


  c.track([0]);
  c.track([1, 2]);
  c.track([3]);

  expect(c.isEmpty()).toBe(false);
  expect(c.pop()).toEqual([0, 1, 2, 3]); // all the items should be stored in sequential order
  expect(c.isEmpty()).toBe(true);

  // should empty the queue
  c.track([0]);
  c.clear();
  expect(c.pop()).toEqual([]);
  expect(c.isEmpty()).toBe(true);
});

test('IMPRESSIONS CACHE IN MEMORY / Should call "onFullQueueCb" when the queue is full.', () => {
  let cbCalled = 0;
  const cache = new ImpressionsCacheInMemory(3); // small impressionsQueueSize to be reached
  cache.setOnFullQueueCb(() => { cbCalled++; cache.clear(); });

  cache.track([0]);
  cache.track([0]);
  expect(cbCalled).toBe(0); // if the queue is not full, it will not run the callback.
  cache.track([0]);
  expect(cbCalled).toBe(1); // if we had the queue full, it should flush events.
  cache.track([1]);
  expect(cbCalled).toBe(1); // After that, while the queue is below max size, it should not try to flush it.
  cache.track([2]);
  expect(cbCalled).toBe(1); // After that, while the queue is below max size, it should not try to flush it.
  cache.track([3]);
  expect(cbCalled).toBe(2); // Once we get to the max size, it should try to flush it.
  cache.track([4]);
  expect(cbCalled).toBe(2); // And it should not flush again,
  cache.track([5]);
  expect(cbCalled).toBe(2); // And it should not flush again,
  cache.track([6]);
  expect(cbCalled).toBe(3); // Until the queue is filled with events again.
});

test('IMPRESSIONS CACHE IN MEMORY / Should not throw if the "onFullQueueCb" callback was not provided.', () => {
  const cache = new ImpressionsCacheInMemory(3); // small eventsQueueSize to be reached

  cache.track([0]);
  cache.track([1]); // Cache still not full,
  expect(cache.track.bind(cache, [2])).not.toThrow(); // but when it is full, as 'onFullQueueCb' was not provided, nothing happens but no exceptions are thrown.
  expect(cache.track.bind(cache, [3])).not.toThrow(); // but when it is full, as 'onFullQueueCb' was not provided, nothing happens but no exceptions are thrown.
});
