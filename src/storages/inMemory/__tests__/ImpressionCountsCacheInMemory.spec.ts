// @ts-nocheck
import { ImpressionCountsCacheInMemory } from '../ImpressionCountsCacheInMemory';

test('IMPRESSION COUNTS CACHE / Impression Counter Test makeKey', () => {
  const timestamp = new Date(2020, 9, 2, 10, 0, 0).getTime();
  const counter = new ImpressionCountsCacheInMemory();

  expect(counter._makeKey('someFeature', new Date(2020, 9, 2, 10, 53, 12).getTime())).toBe(`someFeature::${timestamp}`);
  expect(counter._makeKey('', new Date(2020, 9, 2, 10, 53, 12).getTime())).toBe(`::${timestamp}`);
  expect(counter._makeKey(null, new Date(2020, 9, 2, 10, 53, 12).getTime())).toBe(`null::${timestamp}`);
  expect(counter._makeKey(null, 0)).toBe('null::0');
});

test('IMPRESSION COUNTS CACHE / Impression Counter Test BasicUsage', () => {
  const timestamp = new Date(2020, 9, 2, 10, 10, 12).getTime();
  const counter = new ImpressionCountsCacheInMemory();
  counter.track('feature1', timestamp, 1);
  counter.track('feature1', timestamp + 1, 1);
  counter.track('feature1', timestamp + 2, 1);
  counter.track('feature2', timestamp + 3, 2);
  counter.track('feature2', timestamp + 4, 2);

  const counted = counter.pop();
  expect(Object.keys(counted).length).toBe(2);
  expect(counted[counter._makeKey('feature1', timestamp)]).toBe(3);
  expect(counted[counter._makeKey('feature2', timestamp)]).toBe(4);

  // pop with merge
  counter.track('feature1', timestamp, 1);
  counter.track('feature3', timestamp, 10);
  const countedWithMerge = counter.pop(counted);
  expect(Object.keys(countedWithMerge).length).toBe(3);
  expect(countedWithMerge[counter._makeKey('feature1', timestamp)]).toBe(4);
  expect(countedWithMerge[counter._makeKey('feature2', timestamp)]).toBe(4);
  expect(countedWithMerge[counter._makeKey('feature3', timestamp)]).toBe(10);

  counter.clear();
  expect(Object.keys(counter.pop()).length).toBe(0);

  const nextHourTimestamp = new Date(2020, 9, 2, 11, 10, 12).getTime();
  counter.track('feature1', timestamp, 1);
  counter.track('feature1', timestamp + 1, 1);
  counter.track('feature1', timestamp + 2, 1);
  counter.track('feature2', timestamp + 3, 2);
  counter.track('feature2', timestamp + 4, 2);
  counter.track('feature1', nextHourTimestamp, 1);
  counter.track('feature1', nextHourTimestamp + 1, 1);
  counter.track('feature1', nextHourTimestamp + 2, 1);
  counter.track('feature2', nextHourTimestamp + 3, 2);
  counter.track('feature2', nextHourTimestamp + 4, 2);
  expect(counter.isEmpty()).toBe(false);
  const counted2 = counter.pop();
  expect(counter.isEmpty()).toBe(true);
  expect(Object.keys(counted2).length).toBe(4);
  expect(counted2[counter._makeKey('feature1', timestamp)]).toBe(3);
  expect(counted2[counter._makeKey('feature2', timestamp)]).toBe(4);
  expect(counted2[counter._makeKey('feature1', nextHourTimestamp)]).toBe(3);
  expect(counted2[counter._makeKey('feature2', nextHourTimestamp)]).toBe(4);
  expect(Object.keys(counter.pop()).length).toBe(0);
});
