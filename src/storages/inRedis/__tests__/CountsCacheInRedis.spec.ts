import Redis from 'ioredis';
import { KeyBuilderSS } from '../../KeyBuilderSS';
import { CountsCacheInRedis } from '../CountsCacheInRedis';

const prefix = 'counts_cache_ut';
const metadata = { s: 'version', i: 'ip', n: 'hostname' };

test('COUNTS CACHE IN REDIS / cover basic behavior', async () => {
  const connection = new Redis({});
  const keys = new KeyBuilderSS(prefix, metadata);
  const cache = new CountsCacheInRedis(keys, connection);

  await cache.track('counted-metric-one');
  await cache.track('counted-metric-one');

  const keyOne = keys.buildCountKey('counted-metric-one');
  const keyTwo = keys.buildCountKey('counted-metric-two');

  let metricOneValue = await connection.get(keyOne);
  expect(metricOneValue).toBe('2');

  await cache.track('counted-metric-two');

  metricOneValue = await connection.get(keyOne);
  let metricTwoValue = await connection.get(keyTwo);

  expect(metricOneValue).toBe('2');
  expect(metricTwoValue).toBe('1');

  // Clean up
  const keysToClean = await connection.keys(`${prefix}*`);
  if (keysToClean.length) await connection.del(keysToClean);

  await connection.quit();
});
