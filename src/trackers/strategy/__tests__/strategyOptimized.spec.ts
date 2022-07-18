import { ImpressionDTO } from '../../../types';
import { impressionObserverSSFactory } from '../../impressionObserver/impressionObserverSS';
import { impressionObserverCSFactory } from '../../impressionObserver/impressionObserverCS';
import { IStrategy } from '../../types';
import { strategyOptimizedFactory } from '../strategyOptimized';
import { ImpressionCountsCacheInMemory } from '../../../storages/inMemory/ImpressionCountsCacheInMemory';

describe('Strategy', () => {

  const impression1 = {
    feature: 'qc_team',
    keyName: 'emma@split.io',
    treatment: 'no',
    time: Date.now(),
    bucketingKey: 'impr_bucketing_2',
    label: 'default rule'
  } as ImpressionDTO;
  const impression2 = {
    feature: 'qc_team_2',
    keyName: 'emma@split.io',
    treatment: 'yes',
    time: Date.now(),
    bucketingKey: 'impr_bucketing_2',
    label: 'default rule'
  } as ImpressionDTO;
  const impression12 = {
    feature: 'qc_team',
    keyName: 'emma@split.io',
    treatment: 'no',
    time: Date.now(),
    bucketingKey: 'impr_bucketing_2',
    label: 'default rule'
  } as ImpressionDTO;
  const impression13 = {
    feature: 'qc_team',
    keyName: 'emma@split.io',
    treatment: 'no',
    time: Date.now(),
    bucketingKey: 'impr_bucketing_2',
    label: 'default rule'
  } as ImpressionDTO;
  
  let augmentedImp1 = { ...impression1, pt: undefined };
  let augmentedImp12 = { ...impression12, pt: Date.now() };
  let augmentedImp13 = { ...impression12, pt: Date.now() };
  let augmentedImp2 = { ...impression2, pt: undefined };
  
  
  function processStrategy(strategy: IStrategy, impressions: ImpressionDTO[]) {  
    return strategy.process(impressions);
  }
  
  test('strategyOptimized', () => {
    
    const impressionCountsCache = new ImpressionCountsCacheInMemory();
    let impressions = [impression1, impression2, impression12, impression13];
    let augmentedImpressions = [augmentedImp1, augmentedImp2, augmentedImp12, augmentedImp13];
    
    const strategyDebugSS = strategyOptimizedFactory(impressionObserverSSFactory(), impressionCountsCache);
    
    let { impressionsToStore, impressionsToListener, deduped } = processStrategy(strategyDebugSS, impressions);

    expect(impressionsToStore).toStrictEqual([augmentedImp1, augmentedImp2]);
    expect(impressionsToListener).toStrictEqual(augmentedImpressions);
    expect(deduped).toStrictEqual(2);
    
    const strategyDebugCS = strategyOptimizedFactory(impressionObserverCSFactory(), impressionCountsCache);
    
    ({ impressionsToStore, impressionsToListener, deduped } = processStrategy(strategyDebugCS, impressions));
    
    expect(impressionsToStore).toStrictEqual([augmentedImp1, augmentedImp2]);
    expect(impressionsToListener).toStrictEqual(augmentedImpressions);
    expect(deduped).toStrictEqual(2);
    
  });
});
