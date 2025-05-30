import { ISettings } from '../../types';
import { KeyBuilder, getStorageHash } from '../KeyBuilder';
import { KeyBuilderSS } from '../KeyBuilderSS';

test('KEYS / splits keys', () => {
  const builder = new KeyBuilder();

  const splitName = 'split_name__for_testing';
  const expectedKey = `SPLITIO.split.${splitName}`;
  const expectedTill = 'SPLITIO.splits.till';

  expect(builder.buildSplitKey(splitName)).toBe(expectedKey);
  expect(builder.buildSplitsTillKey()).toBe(expectedTill);
  expect(builder.extractKey(builder.buildSplitKey(splitName))).toBe(splitName);
});

test('KEYS / splits keys with custom prefix', () => {
  const prefix = 'js:1234:asd.SPLITIO';
  const builder = new KeyBuilder(prefix);

  const splitName = 'split_name__for_testing';
  const expectedKey = `${prefix}.split.${splitName}`;
  const expectedTill = `${prefix}.splits.till`;

  expect(builder.buildSplitKey(splitName)).toBe(expectedKey);
  expect(builder.buildSplitsTillKey() === expectedTill).toBe(true);
});

const prefix = 'SPLITIO';
export const metadata = { s: 'js_someversion', i: 'some_ip', n: 'some_hostname' };

test('KEYS / segments keys', () => {
  const builder = new KeyBuilderSS(prefix, metadata);

  const segmentName = 'segment_name__for_testing';
  const expectedKey = `SPLITIO.segment.${segmentName}`;
  const expectedTill = `SPLITIO.segment.${segmentName}.till`;

  expect(builder.buildSegmentNameKey(segmentName) === expectedKey).toBe(true);
  expect(builder.buildSegmentTillKey(segmentName) === expectedTill).toBe(true);
});

test('KEYS / traffic type keys', () => {
  const prefix = 'unit_test.SPLITIO';
  const builder = new KeyBuilder(prefix);

  const ttName = 'test_trafficType';
  const expectedKey = `${prefix}.trafficType.${ttName}`;

  expect(builder.buildTrafficTypeKey(ttName)).toBe(expectedKey);

});

test('KEYS / flag set keys', () => {
  const prefix = 'unit_test.SPLITIO';
  const builder = new KeyBuilder(prefix);

  const flagSetName = 'flagset_x';
  const expectedKey = `${prefix}.flagSet.${flagSetName}`;

  expect(builder.buildFlagSetKey(flagSetName)).toBe(expectedKey);

});

test('KEYS / impressions', () => {
  const builder = new KeyBuilderSS(prefix, metadata);

  const expectedImpressionKey = `${prefix}.impressions`;

  expect(builder.buildImpressionsKey() === expectedImpressionKey).toBe(true);
});

test('KEYS / events', () => {
  let builder = new KeyBuilderSS('test-prefix-1', metadata);

  expect(builder.buildEventsKey()).toBe('test-prefix-1.events'); // Events key should only vary because of the storage prefix and return the same value on multiple invocations.
  expect(builder.buildEventsKey()).toBe('test-prefix-1.events'); // Events key should only vary because of the storage prefix and return the same value on multiple invocations.

  builder = new KeyBuilderSS('testPrefix2', metadata);

  expect(builder.buildEventsKey()).toBe('testPrefix2.events'); // Events key should only vary because of the storage prefix and return the same value on multiple invocations.
  expect(builder.buildEventsKey()).toBe('testPrefix2.events'); // Events key should only vary because of the storage prefix and return the same value on multiple invocations.

});

test('KEYS / latency and exception keys (telemetry)', () => {
  const builder = new KeyBuilderSS(prefix, metadata);

  const methodName = 't'; // treatment
  const bucketNumber = 10;

  const expectedLatencyKey = `${prefix}.telemetry.latencies::${metadata.s}/${metadata.n}/${metadata.i}/treatment/${bucketNumber}`;
  expect(builder.buildLatencyKey(methodName, bucketNumber)).toBe(expectedLatencyKey);

  const expectedExceptionKey = `${prefix}.telemetry.exceptions::${metadata.s}/${metadata.n}/${metadata.i}/treatment`;
  expect(builder.buildExceptionKey(methodName)).toBe(expectedExceptionKey);
});

test('getStorageHash', () => {
  expect(getStorageHash({
    core: { authorizationKey: 'sdk-key' },
    sync: { __splitFiltersValidation: { queryString: '&names=p1__split,p2__split' }, flagSpecVersion: '1.3' }
  } as ISettings)).toBe('d700da23');

  expect(getStorageHash({
    core: { authorizationKey: 'sdk-key' },
    sync: { __splitFiltersValidation: { queryString: '&names=p2__split,p3__split' }, flagSpecVersion: '1.3' }
  } as ISettings)).toBe('8c8a8789');

  expect(getStorageHash({
    core: { authorizationKey: 'aaaabbbbcccc1234' },
    sync: { __splitFiltersValidation: { queryString: null }, flagSpecVersion: '1.3' }
  } as ISettings)).toBe('dc1f9817');

  expect(getStorageHash({
    core: { authorizationKey: 'another-sdk-key' },
    sync: { __splitFiltersValidation: { queryString: null }, flagSpecVersion: '1.3' }
  } as ISettings)).toBe('45c6ba5d');
});
