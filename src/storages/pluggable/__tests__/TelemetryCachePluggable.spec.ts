import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
import { KeyBuilderSS } from '../../KeyBuilderSS';
import { wrapperMockFactory } from './wrapper.mock';
import { TelemetryCachePluggable } from '../TelemetryCachePluggable';
import { fakeMetadata } from './ImpressionsCachePluggable.spec';

const prefix = 'telemetry_cache_ut';
const exceptionKey = `${prefix}.telemetry.exceptions`;
const latencyKey = `${prefix}.telemetry.latencies`;
const initKey = `${prefix}.telemetry.init`;
const fieldVersionablePrefix = `${fakeMetadata.s}/${fakeMetadata.n}/${fakeMetadata.i}`;

test('TELEMETRY CACHE PLUGGABLE', async () => {

  const keysBuilder = new KeyBuilderSS(prefix, fakeMetadata);
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
});
