import { impressionObserverSSFactory } from '../../impressionObserver/impressionObserverSS';
import { impressionObserverCSFactory } from '../../impressionObserver/impressionObserverCS';
import { strategyDebugFactory } from '../strategyDebug';
import { impression1, impression2 } from './testUtils';

test('strategyDebug', () => {
  
  let augmentedImp1 = { ...impression1, pt: undefined };
  let augmentedImp12 = { ...impression1, pt: impression1.time };
  let augmentedImp2 = { ...impression2, pt: undefined };
  
  let impressions = [impression1, impression2, {...impression1}];
  let augmentedImpressions = [augmentedImp1, augmentedImp2, augmentedImp12];
  
  const strategyDebugSS = strategyDebugFactory(impressionObserverSSFactory());
  
  let { impressionsToStore, impressionsToListener, deduped } = strategyDebugSS.process(impressions);
  
  expect(impressionsToStore).toStrictEqual(augmentedImpressions);
  expect(impressionsToListener).toStrictEqual(augmentedImpressions);
  expect(deduped).toStrictEqual(0);
  
  const strategyDebugCS = strategyDebugFactory(impressionObserverCSFactory());
  
  ({ impressionsToStore, impressionsToListener, deduped } = strategyDebugCS.process(impressions));
  
  expect(impressionsToStore).toStrictEqual(augmentedImpressions);
  expect(impressionsToListener).toStrictEqual(augmentedImpressions);
  expect(deduped).toStrictEqual(0);
    
});
