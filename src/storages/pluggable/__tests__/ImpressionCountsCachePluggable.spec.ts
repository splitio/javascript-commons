// @ts-nocheck
import { ImpressionCountsCachePluggable } from '../ImpressionCountsCachePluggable';
import { truncateTimeFrame } from '../../../utils/time';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { wrapperMock } from './wrapper.mock';

describe('IMPRESSION COUNTS CACHE PLUGGABLE', () => {
  const key = 'impression_count_post';
  const timestamp = new Date(2020, 9, 2, 10, 10, 12).getTime();
  const nextHourTimestamp = new Date(2020, 9, 2, 11, 10, 12).getTime();

  afterEach(() => {
    wrapperMock.mockClear();
  });

  test('"start" and "stop" methods', (done) => {
    const refreshRate = 100;
    const counter = new ImpressionCountsCachePluggable(loggerMock, key, wrapperMock, undefined, refreshRate);

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

    expect(wrapperMock.incr).not.toBeCalled();

    counter.start();
    expect(counter.isEmpty()).toBe(false);

    setTimeout(() => {
      expect(wrapperMock.incr).toBeCalledTimes(4);
      expect(wrapperMock.incr.mock.calls).toEqual([
        [`${key}::feature1::${truncateTimeFrame(timestamp)}`, 3],
        [`${key}::feature2::${truncateTimeFrame(timestamp)}`, 4],
        [`${key}::feature1::${truncateTimeFrame(nextHourTimestamp)}`, 3],
        [`${key}::feature2::${truncateTimeFrame(nextHourTimestamp)}`, 4]
      ]);
      expect(counter.isEmpty()).toBe(true);

      counter.stop();
      expect(wrapperMock.incr).toBeCalledTimes(4); // Stopping when cache is empty, does not call the wrapper
      counter.track('feature3', nextHourTimestamp + 4, 2);
    }, refreshRate + 20);

    setTimeout(() => {
      expect(wrapperMock.incr).toBeCalledTimes(4);
      expect(counter.isEmpty()).toBe(false);
      counter.start();
      counter.stop().then(() => {
        expect(wrapperMock.incr).toBeCalledTimes(5); // Stopping when cache is not empty, calls the wrapper
        expect(counter.isEmpty()).toBe(true);
        done();
      });
    }, 2 * refreshRate + 20);

  });

  test('Should call "onFullQueueCb" when the queue is full. "getImpressionsCount" should pop data.', async () => {
    const key = 'other_key';
    const counter = new ImpressionCountsCachePluggable(loggerMock, key, wrapperMock, 5);

    counter.track('feature1', timestamp + 1, 1);
    counter.track('feature1', timestamp + 2, 1);
    counter.track('feature2', timestamp + 3, 2);

    expect(wrapperMock.incr).not.toBeCalled();
    expect(counter.isEmpty()).toBe(false);

    counter.track('feature2', nextHourTimestamp, 1);

    // Wrapper operations are called asynchronously
    await new Promise(resolve => setTimeout(resolve));

    expect(wrapperMock.incr.mock.calls).toEqual([
      [`${key}::feature1::${truncateTimeFrame(timestamp)}`, 2],
      [`${key}::feature2::${truncateTimeFrame(timestamp)}`, 2],
      [`${key}::feature2::${truncateTimeFrame(nextHourTimestamp)}`, 1]
    ]);

    expect(counter.isEmpty()).toBe(true);

    // Validate `getImpressionsCount` method
    expect(await counter.getImpressionsCount()).toStrictEqual({ // pop data
      pf: [
        { f: 'feature1', m: truncateTimeFrame(timestamp), rc: 2 },
        { f: 'feature2', m: truncateTimeFrame(timestamp), rc: 2 },
        { f: 'feature2', m: truncateTimeFrame(nextHourTimestamp), rc: 1 },
      ]
    });
    expect(await counter.getImpressionsCount()).toStrictEqual(undefined); // try to pop data again
  });
});
