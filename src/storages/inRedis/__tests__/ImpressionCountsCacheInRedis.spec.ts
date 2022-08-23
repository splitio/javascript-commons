// @ts-nocheck
import { ImpressionCountsCacheInRedis} from '../ImpressionCountsCacheInRedis';
import Redis from 'ioredis';

describe('IMPRESSION COUNTS CACHE IN REDIS', () => {
  const key = 'impression_count_post';
  const timestamp = new Date(2020, 9, 2, 10, 10, 12).getTime();
  const nextHourTimestamp = new Date(2020, 9, 2, 11, 10, 12).getTime();
  const expected = {
    'feature1::1601643600000': '3',
    'feature1::1601647200000': '3',
    'feature2::1601643600000': '4',
    'feature2::1601647200000': '4'
  };
  
  test('IMPRESSION COUNTS CACHE IN REDIS / Impression Counter Test makeKey', () => {
    const connection = new Redis();
    const counter = new ImpressionCountsCacheInRedis(key, connection);
    const timestamp1 = new Date(2020, 9, 2, 10, 0, 0).getTime();

    expect(counter._makeKey('someFeature', new Date(2020, 9, 2, 10, 53, 12).getTime())).toBe(`someFeature::${timestamp1}`);
    expect(counter._makeKey('', new Date(2020, 9, 2, 10, 53, 12).getTime())).toBe(`::${timestamp1}`);
    expect(counter._makeKey(null, new Date(2020, 9, 2, 10, 53, 12).getTime())).toBe(`null::${timestamp1}`);
    expect(counter._makeKey(null, 0)).toBe('null::0');
    
    connection.quit();
  });

  test('IMPRESSION COUNTS CACHE IN REDIS/ Impression Counter Test BasicUsage', () => {
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
    
    connection.del(key);
    connection.quit();
  });

  test('POST IMPRESSION COUNTS IN REDIS FUNCTION', (done) => {
    const connection = new Redis();
    const counter = new ImpressionCountsCacheInRedis(key, connection);
    
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

      connection.hgetall(key).then(data => {
        expect(data).toStrictEqual(expected);
        connection.del(key);
        connection.quit();
        done();
      });
    });
  });
  
  test('IMPRESSION COUNTS CACHE IN REDIS / start and stop task', (done) => {
    
    const connection = new Redis();
    const counter = new ImpressionCountsCacheInRedis(key, connection);

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
    
    const refreshRate = 500; 
    counter.start(refreshRate);
    setTimeout(() => {
      connection.hgetall(key, (err, data) => {
        
        expect(data).toStrictEqual(expected);
        
        counter.stop();
        
        setTimeout(() => {
          
          counter.track('feature3', nextHourTimestamp + 4, 2);
          connection.hgetall(key, (err, data) => {
            expect(data).toStrictEqual(expected);
            
            connection.del(key);
            connection.quit();
            done();
          });
        }, refreshRate+200);
        
      });
    }, refreshRate+200);
  });
  
  test('IMPRESSION COUNTS CACHE IN REDIS / Should call "onFullQueueCb" when the queue is full.', (done) => {
    const connection = new Redis();
    const shortCounter = new ImpressionCountsCacheInRedis(key, connection, 3);
    
    shortCounter.track('feature1', timestamp + 1, 1);
    shortCounter.track('feature1', timestamp + 2, 1);
    shortCounter.track('feature2', timestamp + 3, 2); 
    connection.hgetall(key, (err, data) => {
      expect(data).toStrictEqual({});
    });
    
    shortCounter.track('feature2', nextHourTimestamp, 1);
    
    const expected1 = {
      'feature1::1601643600000': '2', 
      'feature2::1601643600000': '2', 
      'feature2::1601647200000': '1'};
    
    connection.hgetall(key, (err, data) => {
      expect(data).toStrictEqual(expected1);
    });
    
    const expected2 = {
      'feature1::1601643600000': '4', 
      'feature1::1601647200000': '1', 
      'feature2::1601643600000': '4', 
      'feature2::1601647200000': '1'};
    
    shortCounter.track('feature1', timestamp + 1, 1);
    shortCounter.track('feature1', timestamp + 2, 1);
    shortCounter.track('feature2', timestamp + 3, 2); 
    shortCounter.track('feature1', nextHourTimestamp + 2, 1);
    
    connection.hgetall(key, (err, data) => {
      expect(data).toStrictEqual(expected2);
      connection.del(key);
      connection.quit();
      done();
    });
    
  });
});
