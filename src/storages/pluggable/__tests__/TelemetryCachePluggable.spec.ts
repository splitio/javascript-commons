import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { KeyBuilderSS } from '../../KeyBuilderSS';
import { wrapperMockFactory } from './wrapper.mock';
import { TelemetryCachePluggable } from '../TelemetryCachePluggable';
import { metadata } from '../../__tests__/KeyBuilder.spec';

const prefix = 'telemetry_cache_ut';
const exceptionKey = `${prefix}.telemetry.exceptions`;
const latencyKey = `${prefix}.telemetry.latencies`;
const initKey = `${prefix}.telemetry.init`;
const fieldVersionablePrefix = `${metadata.s}/${metadata.n}/${metadata.i}`;

test('TELEMETRY CACHE PLUGGABLE', async () => {

  const keysBuilder = new KeyBuilderSS(prefix, metadata);
  const wrapper = wrapperMockFactory();
  const cache = new TelemetryCachePluggable(loggerMock, keysBuilder, wrapper);

  // recordException
  expect(await cache.recordException('tr')).toBe(1);
  expect(await cache.recordException('tr')).toBe(2);

  expect(await wrapper.get(exceptionKey + '::' + fieldVersionablePrefix + '/track')).toBe('2');
  expect(await wrapper.get(exceptionKey + '::' + fieldVersionablePrefix + '/treatment')).toBe(null);

  // recordLatency
  expect(await cache.recordLatency('tr', 1.6)).toBe(1);
  expect(await cache.recordLatency('tr', 1.6)).toBe(2);

  expect(await wrapper.get(latencyKey + '::' + fieldVersionablePrefix + '/track/2')).toBe('2');
  expect(await wrapper.get(latencyKey + '::' + fieldVersionablePrefix + '/treatment/2')).toBe(null);

  // recordConfig
  await cache.recordConfig();
  expect(JSON.parse(await wrapper.get(initKey + '::' + fieldVersionablePrefix) as string)).toEqual({
    oM: 1,
    st: 'pluggable',
    aF: 0,
    rF: 0
  });

  // popLatencies
  const latencies = await cache.popLatencies();
  latencies.forEach((latency, m) => {
    expect(JSON.parse(m)).toEqual(metadata);
    expect(latency.tr[2]).toBe(2);
  });

  // popExceptions
  const exceptions = await cache.popExceptions();
  exceptions.forEach((exception, m) => {
    expect(JSON.parse(m)).toEqual(metadata);
    expect(exception.tr).toBe(2);
  });

  // popConfigs
  const configs = await cache.popConfigs();
  configs.forEach((config, m) => {
    expect(JSON.parse(m)).toEqual(metadata);
    expect(config).toEqual({
      oM: 1,
      st: 'pluggable',
      aF: 0,
      rF: 0
    });
  });

  // pops when there is no data
  expect(await cache.popLatencies()).toEqual(new Map());
  expect(await cache.popExceptions()).toEqual(new Map());
  expect(await cache.popConfigs()).toEqual(new Map());
});
