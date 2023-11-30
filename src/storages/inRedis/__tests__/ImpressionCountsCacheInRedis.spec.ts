// @ts-nocheck
import { ImpressionCountsCacheInRedis } from '../ImpressionCountsCacheInRedis';
import { truncateTimeFrame } from '../../../utils/time';
import { RedisMock } from '../../../utils/redis/RedisMock';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { RedisAdapter } from '../RedisAdapter';

describe('IMPRESSION COUNTS CACHE IN REDIS', () => {
  const key = 'impression_count_post';
  const timestamp = new Date(2020, 9, 2, 10, 10, 12).getTime();
  const nextHourTimestamp = new Date(2020, 9, 2, 11, 10, 12).getTime();
  const expected = {
    [`feature1::${truncateTimeFrame(timestamp)}`]: '3',
    [`feature1::${truncateTimeFrame(nextHourTimestamp)}`]: '3',
    [`feature2::${truncateTimeFrame(timestamp)}`]: '4',
    [`feature2::${truncateTimeFrame(nextHourTimestamp)}`]: '4'
  };

  test('Impression Counter Test makeKey', async () => {
    const connection = new RedisAdapter(loggerMock);
    const counter = new ImpressionCountsCacheInRedis(loggerMock, key, connection);
    const timestamp1 = new Date(2020, 9, 2, 10, 0, 0).getTime();

    expect(counter._makeKey('someFeature', new Date(2020, 9, 2, 10, 53, 12).getTime())).toBe(`someFeature::${timestamp1}`);
    expect(counter._makeKey('', new Date(2020, 9, 2, 10, 53, 12).getTime())).toBe(`::${timestamp1}`);
    expect(counter._makeKey(null, new Date(2020, 9, 2, 10, 53, 12).getTime())).toBe(`null::${timestamp1}`);
    expect(counter._makeKey(null, 0)).toBe('null::0');

    await connection.disconnect();
  });

  test('Impression Counter Test BasicUsage', async () => {
    const connection = new RedisAdapter(loggerMock);
    const counter = new ImpressionCountsCacheInRedis(loggerMock, key, connection);

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

    await connection.del(key);
    await connection.disconnect();
  });

  test('POST IMPRESSION COUNTS IN REDIS FUNCTION', async () => {
    const connection = new RedisAdapter(loggerMock);
    // @TODO next line is not required with ioredis
    await new Promise(res => connection.once('ready', res));

    const counter = new ImpressionCountsCacheInRedis(loggerMock, key, connection);
    // Clean up in case there are still keys there.
    connection.del(key);
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

    await counter.postImpressionCountsInRedis();

    const data = await connection.hgetall(key);
    expect(data).toStrictEqual(expected);
    await connection.del(key);
    await connection.disconnect();
  });

  test('start and stop task', (done) => {

    const connection = new RedisMock();
    const refreshRate = 100;
    const counter = new ImpressionCountsCacheInRedis(loggerMock, key, connection, undefined, refreshRate);
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

    expect(connection.pipeline).not.toBeCalled();

    counter.start();
    setTimeout(() => {
      expect(connection.pipeline).toBeCalledTimes(1);
      expect(counter.isEmpty()).toBe(true);
      counter.stop();
      expect(connection.pipeline).toBeCalledTimes(1); // Stopping when cache is empty, does not call the wrapper
      counter.track('feature3', nextHourTimestamp + 4, 2);
    }, refreshRate + 30);

    setTimeout(() => {
      expect(connection.pipeline).toBeCalledTimes(1);
      counter.start();
      setTimeout(() => {
        expect(connection.pipeline).toBeCalledTimes(2);
        counter.stop();
        done();
      }, refreshRate + 30);
    }, 2 * refreshRate + 30);

  });

  test('Should call "onFullQueueCb" when the queue is full. "getImpressionsCount" should pop data.', async () => {
    const connection = new RedisAdapter(loggerMock);
    const counter = new ImpressionCountsCacheInRedis(loggerMock, key, connection, 5);
    // Clean up in case there are still keys there.
    await connection.del(key);
    counter.track('feature1', timestamp + 1, 1);
    counter.track('feature1', timestamp + 2, 1);
    counter.track('feature2', timestamp + 3, 2);

    expect(await connection.hgetall(key)).toStrictEqual({});

    counter.track('feature2', nextHourTimestamp, 1);

    const expected1 = {};
    expected1[`feature1::${truncateTimeFrame(timestamp)}`] = '2';
    expected1[`feature2::${truncateTimeFrame(timestamp)}`] = '2';
    expected1[`feature2::${truncateTimeFrame(nextHourTimestamp)}`] = '1';

    expect(await connection.hgetall(key)).toStrictEqual(expected1);

    counter.track('feature1', timestamp + 1, 1);
    counter.track('feature1', timestamp + 2, 1);
    counter.track('feature2', timestamp + 3, 2);
    counter.track('feature1', nextHourTimestamp + 2, 3);

    // Validate `getImpressionsCount` method
    expect(await counter.getImpressionsCount()).toStrictEqual({ // pop data
      pf: [
        { f: 'feature1', m: truncateTimeFrame(timestamp), rc: 4 },
        { f: 'feature2', m: truncateTimeFrame(timestamp), rc: 4 },
        { f: 'feature2', m: truncateTimeFrame(nextHourTimestamp), rc: 1 },
        { f: 'feature1', m: truncateTimeFrame(nextHourTimestamp), rc: 3 },
      ]
    });
    expect(await counter.getImpressionsCount()).toStrictEqual(undefined); // try to pop data again

    expect(await connection.hgetall(key)).toStrictEqual({});
    await connection.del(key);
    await connection.disconnect();
  });
});
