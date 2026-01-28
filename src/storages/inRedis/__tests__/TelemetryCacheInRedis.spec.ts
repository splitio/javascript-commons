import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { KeyBuilderSS } from '../../KeyBuilderSS';
import { TelemetryCacheInRedis } from '../TelemetryCacheInRedis';
import { metadata } from '../../__tests__/KeyBuilder.spec';
import { RedisAdapter } from '../RedisAdapter';

const prefix = 'telemetry_cache_ut';
const exceptionKey = `${prefix}.telemetry.exceptions`;
const latencyKey = `${prefix}.telemetry.latencies`;
const initKey = `${prefix}.telemetry.init`;
const fieldVersionablePrefix = `${metadata.s}/${metadata.n}/${metadata.i}`;

describe('TELEMETRY CACHE IN REDIS', () => {
  let connection: RedisAdapter;
  let cache: TelemetryCacheInRedis;
  let keysBuilder: KeyBuilderSS;

  beforeEach(async () => {
    keysBuilder = new KeyBuilderSS(prefix, metadata);
    connection = new RedisAdapter(loggerMock);
    cache = new TelemetryCacheInRedis(loggerMock, keysBuilder, connection);

    await connection.del(exceptionKey);
    await connection.del(latencyKey);
    await connection.del(initKey);
  });

  test('TELEMETRY CACHE IN REDIS', async () => {

    // recordException
    expect(await cache.recordException('tr')).toBe(1);
    expect(await cache.recordException('tr')).toBe(2);
    expect(await cache.recordException('tcfs')).toBe(1);

    expect(await connection.hget(exceptionKey, fieldVersionablePrefix + '/track')).toBe('2');
    expect(await connection.hget(exceptionKey, fieldVersionablePrefix + '/treatment')).toBe(null);
    expect(await connection.hget(exceptionKey, fieldVersionablePrefix + '/treatmentsWithConfigByFlagSets')).toBe('1');

    // recordLatency
    expect(await cache.recordLatency('tr', 1.6)).toBe(1);
    expect(await cache.recordLatency('tr', 1.6)).toBe(2);
    expect(await cache.recordLatency('tfs', 1.6)).toBe(1);

    expect(await connection.hget(latencyKey, fieldVersionablePrefix + '/track/2')).toBe('2');
    expect(await connection.hget(latencyKey, fieldVersionablePrefix + '/treatment/2')).toBe(null);
    expect(await connection.hget(latencyKey, fieldVersionablePrefix + '/treatmentsByFlagSets/2')).toBe('1');

    // recordConfig
    expect(await cache.recordConfig()).toBe(1);
    expect(JSON.parse(await connection.hget(initKey, fieldVersionablePrefix) as string)).toEqual({
      oM: 1,
      st: 'redis',
      aF: 0,
      rF: 0
    });

    // popLatencies
    const latencies = await cache.popLatencies();
    latencies.forEach((latency, m) => {
      expect(JSON.parse(m)).toEqual(metadata);
      expect(latency).toEqual({
        tfs: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        tr: [0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      });
    });
    expect(await connection.hget(latencyKey, fieldVersionablePrefix + '/track/2')).toBe(null);

    // popExceptions
    const exceptions = await cache.popExceptions();
    exceptions.forEach((exception, m) => {
      expect(JSON.parse(m)).toEqual(metadata);
      expect(exception).toEqual({
        tcfs: 1,
        tr: 2,
      });
    });
    expect(await connection.hget(exceptionKey, fieldVersionablePrefix + '/track')).toBe(null);

    // popConfig
    const configs = await cache.popConfigs();
    configs.forEach((config, m) => {
      expect(JSON.parse(m)).toEqual(metadata);
      expect(config).toEqual({
        oM: 1,
        st: 'redis',
        aF: 0,
        rF: 0
      });
    });
    expect(await connection.hget(initKey, fieldVersionablePrefix)).toBe(null);

    // pops when there is no data
    expect((await cache.popLatencies()).size).toBe(0);
    expect((await cache.popExceptions()).size).toBe(0);
    expect((await cache.popConfigs()).size).toBe(0);
  });
});
