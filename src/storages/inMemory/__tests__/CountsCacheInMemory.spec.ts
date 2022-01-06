import { CountsCacheInMemory } from '../CountsCacheInMemory';

test('COUNT CACHE IN MEMORY / should count metric names incrementatly', () => {
  const cache = new CountsCacheInMemory();

  cache.track('counted-metric-one');
  cache.track('counted-metric-one');
  cache.track('counted-metric-two');

  const state = cache.state();

  expect(state['counted-metric-one']).toBe(2);
  expect(state['counted-metric-two']).toBe(1);
});
