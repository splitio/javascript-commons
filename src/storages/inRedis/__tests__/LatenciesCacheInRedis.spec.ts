import Redis from 'ioredis';
import KeyBuilderSS from '../../KeyBuilderSS';
import LatenciesCacheInRedis from '../LatenciesCacheInRedis';

const prefix = 'latencies_cache_UT';
const metadata = { version: 'js_someversion', ip: 'some_ip', hostname: 'some_hostname' };

test('METRICS (LATENCIES) CACHE IN REDIS / should count based on ranges', async () => {
  const connection = new Redis();
  const keys = new KeyBuilderSS(prefix, metadata);
  const cache = new LatenciesCacheInRedis(keys, connection);
  const metricName = 'testing';

  await cache.track(metricName, 1);
  await cache.track(metricName, 1.2);
  await cache.track(metricName, 1.4);

  expect(await connection.get(keys.buildLatencyKey(metricName, 0))).toBe('3'); // the bucket #0 should have 3

  await cache.track(metricName, 1.5);

  expect(await connection.get(keys.buildLatencyKey(metricName, 1))).toBe('1'); // the bucket #1 should have 1

  await cache.track(metricName, 2.25);
  await cache.track(metricName, 2.26);
  await cache.track(metricName, 2.265);

  expect(await connection.get(keys.buildLatencyKey(metricName, 2))).toBe('3'); // the bucket #2 should have 3

  await cache.track(metricName, 985251);

  expect(await connection.get(keys.buildLatencyKey(metricName, 23))).toBe('1'); // the bucket #23 should have 1

  // Clean up post-test
  const keysToClean = await connection.keys(`${prefix}*`);
  await connection.del(keysToClean);

  await connection.quit();
});
