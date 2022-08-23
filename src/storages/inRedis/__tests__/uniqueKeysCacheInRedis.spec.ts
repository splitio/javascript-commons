// @ts-nocheck
import { UniqueKeysCacheInRedis } from '../UniqueKeysCacheInRedis';
import Redis from 'ioredis';

describe('UNIQUE KEYS CACHE IN REDIS', () => {
  
  test('UNIQUE KEYS CACHE IN REDIS / should incrementally store values, clear the queue, and tell if it is empty', () => {
    const connection = new Redis();
    const key = 'unique_key_post';
    
    const cache = new UniqueKeysCacheInRedis(key, connection);
    
    // queue is initially empty
    expect(cache.pop()).toEqual({keys:[]});
    expect(cache.isEmpty()).toBe(true);

    cache.track('key1', 'feature1');
    cache.track('key2', 'feature2');
    cache.track('key1', 'feature3');

    expect(cache.isEmpty()).toBe(false);
    expect(cache.pop()).toEqual({
      keys: [
        {
          f: 'feature1',
          ks: ['key1']
        },
        {
          f: 'feature2',
          ks: ['key2']
        },
        {
          f: 'feature3',
          ks: ['key1']
        }
      ]
    }); // all the items should be stored in sequential order
    expect(cache.isEmpty()).toBe(true);

    // should empty the queue
    cache.track('key4', 'feature4');
    cache.clear();
    expect(cache.pop()).toEqual({ keys: [] });
    expect(cache.isEmpty()).toBe(true);
    
    connection.quit();
  });

  test('UNIQUE KEYS CACHE IN REDIS / Should call "onFullQueueCb" when the queue is full.', () => {
    let cbCalled = 0;
    const connection = new Redis();
    const key = 'unique_key_post';
    
    const cache = new UniqueKeysCacheInRedis(key, connection, 3); // small uniqueKeysCache size to be reached
    cache.setOnFullQueueCb(() => { cbCalled++; cache.clear(); });

    cache.track('key1', 'feature1');
    cache.track('key1', 'feature1');
    expect(cbCalled).toBe(0); // if the storage is not full, it will not run the callback.
    cache.track('key1', 'feature1');
    expect(cbCalled).toBe(0); // the storage should just have the pair key1 - feature1
    cache.track('key1', 'feature2');
    expect(cbCalled).toBe(0); // storage: {key1: [feature1, feature2]} size: 2
    cache.track('key2', 'feature3');
    expect(cbCalled).toBe(1); // storage: {key1: [feature1, feature2], key2: [feature3]} size: 3 FLUSH!
    cache.track('key2', 'feature4');
    expect(cbCalled).toBe(1); // it should not flush again
    cache.track('key2', 'feature4');
    expect(cbCalled).toBe(1); // And it should not flush again,
    cache.track('key3', 'feature5');
    expect(cbCalled).toBe(1); // And it should not flush again,
    cache.track('key2', 'feature6');
    expect(cbCalled).toBe(2); // Until the queue is filled with events again.
    
    connection.del(key);
    connection.quit();
  });

  test('UNIQUE KEYS CACHE IN REDIS / post unique keys in redis method', async () => {
    const connection = new Redis();
    const key = 'unique_key_post';
    
    const cache = new UniqueKeysCacheInRedis(key, connection, 20);  
    cache.track('key1', 'feature1');
    cache.track('key2', 'feature2');
    cache.track('key1', 'feature3');
    cache.track('key2', 'feature3');
    
    await cache.postUniqueKeysInRedis();
    
    connection.lrange(key, 0, 10, (err, data) => {
      const expected = [
        JSON.stringify({'f': 'feature1', 'ks': ['key1']}),
        JSON.stringify({'f': 'feature2', 'ks': ['key2']}),
        JSON.stringify({'f': 'feature3', 'ks': ['key1', 'key2']})
      ];
      
      expect(data).toStrictEqual(expected);
      
      connection.del(key);
      connection.quit();
    });
    
    
  });
  
  test('UNIQUE KEYS CACHE IN REDIS / start and stop task', (done) => {
    const connection = new Redis();
    const key = 'unique_key_post';
    
    const cache = new UniqueKeysCacheInRedis(key, connection);  
    cache.track('key1', 'feature1');
    cache.track('key2', 'feature2');
    cache.track('key1', 'feature3');
    cache.track('key2', 'feature3');
    
    connection.lrange(key, 0, 10, async (err, data) => {
      expect(data).toStrictEqual([]);
    });
    
    const refreshRate = 500;
    cache.start(refreshRate);
    setTimeout(() => {
      connection.lrange(key, 0, 10, async (err, data) => {

        const expected = [
          JSON.stringify({'f': 'feature1', 'ks': ['key1']}),
          JSON.stringify({'f': 'feature2', 'ks': ['key2']}),
          JSON.stringify({'f': 'feature3', 'ks': ['key1', 'key2']})
        ];
        
        expect(data).toStrictEqual(expected);
        
        cache.stop();
        
        setTimeout(() => {
          
          cache.track('key3', 'feature4');
          connection.lrange(key, 0, 10, async (err, data) => {
            expect(data).toStrictEqual(expected);
            cache.clear();
            
            await connection.del(key);
            await connection.quit();
            done();
          });
        }, refreshRate+200);
        
      });
    }, refreshRate+200);
  });
  
  test('UNIQUE KEYS CACHE IN REDIS / Should call "onFullQueueCb" when the queue is full.', () => {
    const connection = new Redis();
    const key = 'unique_key_post';
    
    const cache = new UniqueKeysCacheInRedis(key, connection, 3);  
    
    cache.track('key1', 'feature1');
    cache.track('key1', 'feature1');
    cache.track('key1', 'feature1');
    connection.lrange(key, 0, 10, (err, data) => {
      expect(data).toStrictEqual([]);
    });
    cache.track('key1', 'feature2');
    cache.track('key2', 'feature3');
    
    const expected1 = [
      JSON.stringify({'f': 'feature1', 'ks': ['key1']}),
      JSON.stringify({'f': 'feature2', 'ks': ['key1']}),
      JSON.stringify({'f': 'feature3', 'ks': ['key2']})
    ];
    
    connection.lrange(key, 0, 10, (err, data) => {
      expect(data).toStrictEqual(expected1);
    });
    
    const expected2 = [
      ... expected1,
      JSON.stringify({'f': 'feature4', 'ks': ['key2']}),
      JSON.stringify({'f': 'feature5', 'ks': ['key3']}),
      JSON.stringify({'f': 'feature6', 'ks': ['key2']})
    ];
    
    cache.track('key2', 'feature4');
    cache.track('key2', 'feature4');
    cache.track('key3', 'feature5');
    cache.track('key2', 'feature6');
    
    connection.lrange(key, 0, 10, (err, data) => {
      expect(data).toStrictEqual(expected2);
      connection.del(key);
      connection.quit();
    });
    
  });
});
