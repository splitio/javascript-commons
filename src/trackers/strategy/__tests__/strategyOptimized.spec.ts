import { impressionObserverSSFactory } from '../../impressionObserver/impressionObserverSS';
import { impressionObserverCSFactory } from '../../impressionObserver/impressionObserverCS';
import { strategyOptimizedFactory } from '../strategyOptimized';
import { ImpressionCountsCacheInMemory } from '../../../storages/inMemory/ImpressionCountsCacheInMemory';
import { impression1, impression2, processStrategy } from './testUtils';

test('strategyOptimized', () => {
  
  let augmentedImp1 = { ...impression1, pt: undefined };
  let augmentedImp12 = { ...impression1, pt: impression1.time };
  let augmentedImp13 = { ...impression1, pt: impression1.time };
  let augmentedImp2 = { ...impression2, pt: undefined };
    
  const impressionCountsCache = new ImpressionCountsCacheInMemory();
  const impressions = [impression1, impression2, {...impression1}, {...impression1}];
  const augmentedImpressions = [augmentedImp1, augmentedImp2, augmentedImp12, augmentedImp13];
  
  const strategyOptimizedSS = strategyOptimizedFactory(impressionObserverSSFactory(), impressionCountsCache);
  
  let { impressionsToStore, impressionsToListener, deduped } = processStrategy(strategyOptimizedSS, impressions);

  expect(impressionsToStore).toStrictEqual([augmentedImp1, augmentedImp2]);
  expect(impressionsToListener).toStrictEqual(augmentedImpressions);
  expect(deduped).toStrictEqual(2);
  
  const strategyOptimizedCS = strategyOptimizedFactory(impressionObserverCSFactory(), impressionCountsCache);
  
  ({ impressionsToStore, impressionsToListener, deduped } = processStrategy(strategyOptimizedCS, impressions));
  
  expect(impressionsToStore).toStrictEqual([augmentedImp1, augmentedImp2]);
  expect(impressionsToListener).toStrictEqual(augmentedImpressions);
  expect(deduped).toStrictEqual(2);
    
});
