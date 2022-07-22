import { impressionObserverSSFactory } from '../../impressionObserver/impressionObserverSS';
import { impressionObserverCSFactory } from '../../impressionObserver/impressionObserverCS';
import { strategyOptimizedFactory } from '../strategyOptimized';
import { ImpressionCountsCacheInMemory } from '../../../storages/inMemory/ImpressionCountsCacheInMemory';
import { impression1, impression12, impression13, impression2, processStrategy } from './testUtils';

test('strategyOptimized', () => {
  
  let augmentedImp1 = { ...impression1, pt: undefined };
  let augmentedImp12 = { ...impression12, pt: impression1.time };
  let augmentedImp13 = { ...impression13, pt: impression1.time };
  let augmentedImp2 = { ...impression2, pt: undefined };
    
  const impressionCountsCache = new ImpressionCountsCacheInMemory();
  let impressions = [{...impression1}, {...impression2}, {...impression12}, {...impression13}];
  let augmentedImpressions = [augmentedImp1, augmentedImp2, augmentedImp12, augmentedImp13];
  
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
