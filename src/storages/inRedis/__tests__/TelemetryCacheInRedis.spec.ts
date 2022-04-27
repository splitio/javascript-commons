import Redis from 'ioredis';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { KeyBuilderSS } from '../../KeyBuilderSS';
import { TelemetryCacheInRedis } from '../TelemetryCacheInRedis';
import { fakeMetadata } from '../../pluggable/__tests__/ImpressionsCachePluggable.spec';

const prefix = 'telemetry_cache_ut';
const exceptionKey = `${prefix}.telemetry.exceptions`;
const latencyKey = `${prefix}.telemetry.latencies`;
const fieldVersionablePrefix = `${fakeMetadata.s}/${fakeMetadata.n}/${fakeMetadata.i}`;

test('TELEMETRY CACHE IN REDIS / `recordLatency` and `recordException`', async () => {

  const keysBuilder = new KeyBuilderSS(prefix, fakeMetadata);
  const connection = new Redis();
  const cache = new TelemetryCacheInRedis(loggerMock, keysBuilder, connection);

  expect(await cache.recordException('tr')).toBe(1);
  expect(await cache.recordException('tr')).toBe(2);

  expect(await connection.hget(exceptionKey, fieldVersionablePrefix + '/track')).toBe('2');
  expect(await connection.hget(exceptionKey, fieldVersionablePrefix + '/treatment')).toBe(null);

  expect(await cache.recordLatency('tr', 1.6)).toBe(1);
  expect(await cache.recordLatency('tr', 1.6)).toBe(2);

  expect(await connection.hget(latencyKey, fieldVersionablePrefix + '/track/2')).toBe('2');
  expect(await connection.hget(latencyKey, fieldVersionablePrefix + '/treatment/2')).toBe(null);

  // Clean up then end.
  await connection.hdel(exceptionKey, fieldVersionablePrefix + '/track');
  await connection.hdel(latencyKey, fieldVersionablePrefix + '/track/2');
  await connection.quit();
});
