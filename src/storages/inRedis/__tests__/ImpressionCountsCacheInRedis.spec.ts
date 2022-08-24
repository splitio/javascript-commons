// @ts-nocheck
import { ImpressionCountsCacheInRedis} from '../ImpressionCountsCacheInRedis';
import { truncateTimeFrame } from '../../../utils/time';

import Redis from 'ioredis';

describe('IMPRESSION COUNTS CACHE IN REDIS', () => {
  const key = 'impression_count_post';
  const timestamp = new Date(2020, 9, 2, 10, 10, 12).getTime();
  const nextHourTimestamp = new Date(2020, 9, 2, 11, 10, 12).getTime();
  const expected = {};
  expected[`feature1::${truncateTimeFrame(timestamp)}`] = '3';
  expected[`feature1::${truncateTimeFrame(nextHourTimestamp)}`] = '3';
  expected[`feature2::${truncateTimeFrame(timestamp)}`] = '4';
  expected[`feature2::${truncateTimeFrame(nextHourTimestamp)}`] = '4';
  
  test('IMPRESSION COUNTS CACHE IN REDIS / Impression Counter Test makeKey', async () => {
    const connection = new Redis();
    const counter = new ImpressionCountsCacheInRedis(key, connection);
    const timestamp1 = new Date(2020, 9, 2, 10, 0, 0).getTime();

    expect(counter._makeKey('someFeature', new Date(2020, 9, 2, 10, 53, 12).getTime())).toBe(`someFeature::${timestamp1}`);
    expect(counter._makeKey('', new Date(2020, 9, 2, 10, 53, 12).getTime())).toBe(`::${timestamp1}`);
    expect(counter._makeKey(null, new Date(2020, 9, 2, 10, 53, 12).getTime())).toBe(`null::${timestamp1}`);
    expect(counter._makeKey(null, 0)).toBe('null::0');
    
    await connection.quit();
  });

  test('IMPRESSION COUNTS CACHE IN REDIS/ Impression Counter Test BasicUsage', async () => {
    const connection = new Redis();
    const counter = new ImpressionCountsCacheInRedis(key, connection);
    
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
    await connection.quit();
  });

  test('POST IMPRESSION COUNTS IN REDIS FUNCTION', (done) => {
    const connection = new Redis();
    const counter = new ImpressionCountsCacheInRedis(key, connection);
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
   
    counter.postImpressionCountsInRedis().then(() => {

      connection.hgetall(key).then( async data => {
        expect(data).toStrictEqual(expected);
        await connection.del(key);
        await connection.quit();
        done();
      });
    });
  });
  
  test('IMPRESSION COUNTS CACHE IN REDIS / start and stop task', (done) => {
    
    const connection = new Redis();
    const counter = new ImpressionCountsCacheInRedis(key, connection);
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
    
    connection.hgetall(key).then(data => {
      expect(data).toStrictEqual({});
    });
    
    const refreshRate = 100; 
    counter.start(refreshRate);
    setTimeout(() => {
      connection.hgetall(key, async (err, data) => {     
        expect(data).toStrictEqual(expected);
        counter.stop();
        counter.track('feature3', nextHourTimestamp + 4, 2);      
      });
    }, 130);
    
    setTimeout(() => {
      
      connection.hgetall(key, async (err, data) => {
        expect(data).toStrictEqual(expected);
        
        await connection.del(key);
        await connection.quit();
        done();
      });
    }, 230);
    
  });
  
  test('IMPRESSION COUNTS CACHE IN REDIS / Should call "onFullQueueCb" when the queue is full.', (done) => {
    const connection = new Redis();
    const shortCounter = new ImpressionCountsCacheInRedis(key, connection, 5);
    // Clean up in case there are still keys there.
    connection.del(key);
    shortCounter.track('feature1', timestamp + 1, 1);
    shortCounter.track('feature1', timestamp + 2, 1);
    shortCounter.track('feature2', timestamp + 3, 2); 
    connection.hgetall(key, (err, data) => {
      expect(data).toStrictEqual({});
    });
    
    shortCounter.track('feature2', nextHourTimestamp, 1);
    
    const expected1 = {};
    expected1[`feature1::${truncateTimeFrame(timestamp)}`] = '2';
    expected1[`feature2::${truncateTimeFrame(timestamp)}`] = '2';
    expected1[`feature2::${truncateTimeFrame(nextHourTimestamp)}`] = '1';
    
    connection.hgetall(key, (err, data) => {
      expect(data).toStrictEqual(expected1);
    });
    
    const expected2 = {};
    expected2[`feature1::${truncateTimeFrame(timestamp)}`] = '4';
    expected2[`feature1::${truncateTimeFrame(nextHourTimestamp)}`] = '3';
    expected2[`feature2::${truncateTimeFrame(timestamp)}`] = '4';
    expected2[`feature2::${truncateTimeFrame(nextHourTimestamp)}`] = '1';
    
    shortCounter.track('feature1', timestamp + 1, 1);
    shortCounter.track('feature1', timestamp + 2, 1);
    shortCounter.track('feature2', timestamp + 3, 2); 
    shortCounter.track('feature1', nextHourTimestamp + 2, 3);
    
    connection.hgetall(key, async (err, data) => {
      expect(data).toStrictEqual(expected2);
      await connection.del(key);
      await connection.quit();
      done();
    });
    
  });
});
