import LatenciesCache from '../LatenciesCacheInMemory';

test('METRICS (LATENCIES) CACHE IN MEMORY / should count based on ranges', () => {
  const metricName = 'testing';
  const c1 = new LatenciesCache();

  c1.track(metricName, 1);
  c1.track(metricName, 1.2);
  c1.track(metricName, 1.4);

  expect(c1.state()[metricName][0] === 3).toBe(true); // the bucket #0 should have 3

  c1.track(metricName, 1.5);
  expect(c1.state()[metricName][1] === 1).toBe(true); // the bucket #1 should have 1

  c1.track(metricName, 2.25);
  c1.track(metricName, 2.26);
  c1.track(metricName, 2.265);
  expect(c1.state()[metricName][2] === 3).toBe(true); // the bucket #3 should have 1

  c1.track(metricName, 985251);
  expect(c1.state()[metricName][23] === 1).toBe(true); // the bucket #23 should have 1

});

test('METRICS (LATENCIES) CACHE IN MEMORY / clear', () => {
  const metricName = 'testing';
  const c1 = new LatenciesCache();

  c1.track(metricName, 1);
  c1.track(metricName, 1000);
  c1.clear();
  expect(c1.isEmpty()).toBe(true); // after call clear, the cache should be empty
});
