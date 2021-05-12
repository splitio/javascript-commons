import KeyBuilder from '../KeyBuilder';
import KeyBuilderSS from '../KeyBuilderSS';

test('KEYS / splits keys', () => {
  const builder = new KeyBuilder();

  const splitName = 'split_name__for_testing';
  const expectedKey = `SPLITIO.split.${splitName}`;
  const expectedTill = 'SPLITIO.splits.till';

  expect(builder.isSplitKey(expectedKey)).toBe(true);
  expect(builder.buildSplitKey(splitName) === expectedKey).toBe(true);
  expect(builder.buildSplitsTillKey() === expectedTill).toBe(true);
  expect(builder.extractKey(builder.buildSplitKey(splitName)) === splitName).toBe(true);

  // NOT USED
  // const expectedReady = 'SPLITIO.splits.ready';
  // expect(builder.buildSplitsReady() === expectedReady).toBe(true);
});

test('KEYS / splits keys with custom prefix', () => {
  const prefix = 'js:1234:asd.SPLITIO';
  const builder = new KeyBuilder(prefix);

  const splitName = 'split_name__for_testing';
  const expectedKey = `${prefix}.split.${splitName}`;
  const expectedTill = `${prefix}.splits.till`;

  expect(builder.isSplitKey(expectedKey)).toBe(true);
  expect(builder.buildSplitKey(splitName)).toBe(expectedKey);
  expect(builder.buildSplitsTillKey() === expectedTill).toBe(true);

  // NOT USED
  // const expectedReady = `${prefix}.SPLITIO.splits.ready`;
  // expect(builder.buildSplitsReady() === expectedReady).toBe(true);
});

test('KEYS / segments keys', () => {
  // @ts-expect-error
  const builder = new KeyBuilderSS();

  const segmentName = 'segment_name__for_testing';
  const expectedKey = `SPLITIO.segment.${segmentName}`;
  const expectedTill = `SPLITIO.segment.${segmentName}.till`;

  expect(builder.buildSegmentNameKey(segmentName) === expectedKey).toBe(true);
  expect(builder.buildSegmentTillKey(segmentName) === expectedTill).toBe(true);

  // NOT USED
  // const expectedReady = 'SPLITIO.segments.ready';
  // expect(builder.buildSegmentsReady() === expectedReady).toBe(true);
});

test('KEYS / traffic type keys', () => {
  const prefix = 'unit_test.SPLITIO';
  const builder = new KeyBuilder(prefix);

  const ttName = 'test_trafficType';
  const expectedKey = `${prefix}.trafficType.${ttName}`;

  expect(builder.buildTrafficTypeKey(ttName)).toBe(expectedKey);

});

test('KEYS / impressions', () => {
  const prefix = 'SPLITIO';
  const metadata = { s: 'js-1234', i: '10-10-10-10', n: 'UNKNOWN' };
  const builder = new KeyBuilderSS(prefix, metadata);

  const expectedImpressionKey = `${prefix}.impressions`;

  expect(builder.buildImpressionsKey() === expectedImpressionKey).toBe(true);
});

test('KEYS / events', () => {
  // @ts-expect-error
  let builder = new KeyBuilderSS('test-prefix-1');

  expect(builder.buildEventsKey()).toBe('test-prefix-1.events'); // Events key should only vary because of the storage prefix and return the same value on multiple invocations.
  expect(builder.buildEventsKey()).toBe('test-prefix-1.events'); // Events key should only vary because of the storage prefix and return the same value on multiple invocations.

  // @ts-expect-error
  builder = new KeyBuilderSS('testPrefix2');

  expect(builder.buildEventsKey()).toBe('testPrefix2.events'); // Events key should only vary because of the storage prefix and return the same value on multiple invocations.
  expect(builder.buildEventsKey()).toBe('testPrefix2.events'); // Events key should only vary because of the storage prefix and return the same value on multiple invocations.

});

test('KEYS / latency keys', () => {
  const prefix = 'SPLITIO';
  const metadata = { s: 'js-1234', i: '10-10-10-10', n: 'UNKNOWN' };
  const builder = new KeyBuilderSS(prefix, metadata);

  const metricName = 'unit testing metric name';
  const bucketNumber = '10';

  const expectedLatencyKey = `${prefix}/${metadata.s}/${metadata.i}/latency.${metricName}.bucket.${bucketNumber}`;

  expect(builder.buildLatencyKey(metricName, bucketNumber) === expectedLatencyKey).toBe(true);

  // NOT USED
  // const metricNameAndBucket = builder.extractLatencyMetricNameAndBucket(expectedLatencyKey);
  // expect(metricName === metricNameAndBucket.metricName).toBe(true);
  // expect(bucketNumber === metricNameAndBucket.bucketNumber).toBe(true);
});
