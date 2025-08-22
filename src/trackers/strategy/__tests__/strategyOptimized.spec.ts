import { impressionObserverSSFactory } from '../../impressionObserver/impressionObserverSS';
import { impressionObserverCSFactory } from '../../impressionObserver/impressionObserverCS';
import { strategyOptimizedFactory } from '../strategyOptimized';
import { ImpressionCountsCacheInMemory } from '../../../storages/inMemory/ImpressionCountsCacheInMemory';
import { impression1, impression2 } from './testUtils';

test.each([
  impressionObserverSSFactory(),
  impressionObserverCSFactory()
])('strategyOptimized', () => {

  const impressionCountsCache = new ImpressionCountsCacheInMemory();
  const strategyOptimizedSS = strategyOptimizedFactory(impressionObserverSSFactory(), impressionCountsCache);

  const impressions = [{...impression1}, {...impression2}, {...impression1}, {...impression1}];

  expect(strategyOptimizedSS.process(impressions[0])).toBe(true);
  expect(impressions[0]).toEqual({ ...impression1, pt: undefined });

  expect(strategyOptimizedSS.process(impressions[1])).toBe(true);
  expect(impressions[1]).toEqual({ ...impression2, pt: undefined });

  expect(strategyOptimizedSS.process(impressions[2])).toBe(false);
  expect(impressions[2]).toEqual({ ...impression1, pt: impression1.time });

  expect(strategyOptimizedSS.process(impressions[3])).toBe(false);
  expect(impressions[3]).toEqual({ ...impression1, pt: impression1.time });
});
