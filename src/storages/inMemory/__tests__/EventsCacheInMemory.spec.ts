// @ts-nocheck
import { EventsCacheInMemory } from '../EventsCacheInMemory';

test('EVENTS CACHE / Should be able to instantiate and start with an empty queue', () => {
  let cache;
  const createInstance = () => cache = new EventsCacheInMemory(500); // 500 as eventsQueueSize

  expect(createInstance).not.toThrow(); // Creation should not throw.
  expect(cache.state()).toEqual([]); // The queue starts empty.
});

test('EVENTS CACHE / Should be able to add items sequentially and retrieve the queue', () => {
  const cache = new EventsCacheInMemory(500);
  const queueValues = [1, '2', { p: 3 }, ['4']];

  expect(cache.track.bind(cache, queueValues[0])).not.toThrow(); // Calling track should not throw
  // Testing the throw on one is enough.
  cache.track(queueValues[1]);
  cache.track(queueValues[2]);
  cache.track(queueValues[3]);

  const state = cache.state();

  expect(state.length).toBe(4 /* pushed 4 items */); // The amount of items on queue should match the amount we pushed
  expect(state).toEqual(queueValues); // The items should be in the queue and ordered as they were added.
});

test('EVENTS CACHE / Should be able to clear the queue and accumulated byte size', () => {
  const cache = new EventsCacheInMemory(500);

  cache.track('test1', 2019);
  cache.clear();

  expect(cache.state()).toEqual([]); // The queue should be clear.
  expect(cache.queueByteSize).toBe(0); // The accumulated byte size should had been cleared.
});

test('EVENTS CACHE / Should be able to tell if the queue is empty', () => {
  const cache = new EventsCacheInMemory(500);

  expect(cache.state().length === 0).toBe(true); // The queue is empty,
  expect(cache.isEmpty()).toBe(true); // so if it is empty, it returns true.

  cache.track('test');

  expect(cache.state().length > 0).toBe(true); // If we add something to the queue,
  expect(cache.isEmpty()).toBe(false); // it will return false.
});

test('EVENTS CACHE / Should be able to return the DTO we will send to BE', () => {
  const cache = new EventsCacheInMemory(500);
  const queueValues = [1, '2', { p: 3 }, ['4']];

  cache.track(queueValues[0]);
  cache.track(queueValues[1]);
  cache.track(queueValues[2]);
  cache.track(queueValues[3]);

  const json = cache.state();
  expect(json).toEqual(queueValues); // For now the DTO is just an array of the saved events.
});

test('EVENTS CACHE / Should call "onFullQueueCb" when the queue is full (count wise).', () => {

  let cbCalled = 0;
  const cache = new EventsCacheInMemory(3); // small eventsQueueSize to be reached
  cache.setOnFullQueueCb(() => { cbCalled++; cache.clear(); });

  cache.track(0);
  cache.track(0);
  expect(cbCalled).toBe(0); // if the queue is not full, it will not run the callback.
  cache.track(0);
  expect(cbCalled).toBe(1); // if we had the queue full, it should flush events.
  cache.track(1);
  expect(cbCalled).toBe(1); // After that, while the queue is below max size, it should not try to flush it.
  cache.track(2);
  expect(cbCalled).toBe(1); // After that, while the queue is below max size, it should not try to flush it.
  cache.track(3);
  expect(cbCalled).toBe(2); // Once we get to the max size, it should try to flush it.
  cache.track(4);
  expect(cbCalled).toBe(2); // And it should not flush again,
  cache.track(5);
  expect(cbCalled).toBe(2); // And it should not flush again,
  cache.track(6);
  expect(cbCalled).toBe(3); // Until the queue is filled with events again.

});

test('EVENTS CACHE / Should call "onFullQueueCb" when the queue is full (size wise).', () => {

  let cbCalled = 0;
  const cache = new EventsCacheInMemory(99999999); // big eventsQueueSize to never be reached
  cache.setOnFullQueueCb(() => { cbCalled++; cache.clear(); });

  // The track method receives the size, which calculation is validated elsewhere.
  // Set the size on the limit.
  cache.track(0, 5 * 1024 * 1024);
  expect(cbCalled).toBe(0); // if the queue is not full (not exceed the queueByteSize limit), it will not run the callback.
  cache.track(2, 1); // exceed the limit by one byte
  expect(cbCalled).toBe(1); // Once we get to the max size again, it should try to flush it.
  cache.track(3, 3 * 1024 * 1024);
  expect(cbCalled).toBe(1); // And it should not flush again,
  cache.track(3, 1.5 * 1024 * 1024);
  expect(cbCalled).toBe(1); // And it should not flush again,
  cache.track(6, 0.6 * 1024 * 1024); // exceed the limit
  expect(cbCalled).toBe(2); // Until the queue is filled with events again.
});

test('EVENTS CACHE / Should not throw if the "onFullQueueCb" callback was not provided.', () => {

  const cache = new EventsCacheInMemory(3); // small eventsQueueSize to be reached

  cache.track(0, 2048);
  cache.track(1, 1024); // Cache still not full,
  expect(cache.track.bind(cache, 2)).not.toThrow(); // but when it is full, as 'onFullQueueCb' was not provided, nothing happens but no exceptions are thrown.
  expect(cache.track.bind(cache, 3)).not.toThrow(); // but when it is full, as 'onFullQueueCb' was not provided, nothing happens but no exceptions are thrown.
});
