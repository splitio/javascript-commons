import { ImpressionDTO } from '../../../types';
import { impressionObserverSSFactory } from '../../impressionObserver/impressionObserverSS';
import { impressionObserverCSFactory } from '../../impressionObserver/impressionObserverCS';
import { IStrategy } from '../../types';
import { strategyDebugFactory } from '../strategyDebug';

describe('Strategy', () => {

  const impression1 = {
    feature: 'qc_team',
    keyName: 'emma@split.io',
    treatment: 'no',
    time: 123456789,
    bucketingKey: 'impr_bucketing_2',
    label: 'default rule'
  } as ImpressionDTO;
  const impression2 = {
    feature: 'qc_team_2',
    keyName: 'emma@split.io',
    treatment: 'yes',
    time: 123456789,
    bucketingKey: 'impr_bucketing_2',
    label: 'default rule'
  } as ImpressionDTO;
  const impression12 = {
    feature: 'qc_team',
    keyName: 'emma@split.io',
    treatment: 'no',
    time: 123456791,
    bucketingKey: 'impr_bucketing_2',
    label: 'default rule'
  } as ImpressionDTO;
  
  let augmentedImp1 = { ...impression1, pt: undefined };
  let augmentedImp12 = { ...impression12, pt: 123456789 };
  let augmentedImp2 = { ...impression2, pt: undefined };
  
  
  function processStrategy(strategy: IStrategy, impressions: ImpressionDTO[]) {  
    return strategy.process(impressions);
  }
  
  test('strategyDebug', () => {
    
    let impressions = [impression1, impression2, impression12];
    let augmentedImpressions = [augmentedImp1, augmentedImp2, augmentedImp12];
    
    const strategyDebugSS = strategyDebugFactory(impressionObserverSSFactory());
    
    let { impressionsToStore, impressionsToListener, deduped } = processStrategy(strategyDebugSS, impressions);
    
    expect(impressionsToStore).toStrictEqual(augmentedImpressions);
    expect(impressionsToListener).toStrictEqual(augmentedImpressions);
    expect(deduped).toStrictEqual(0);
    
    const strategyDebugCS = strategyDebugFactory(impressionObserverCSFactory());
    
    ({ impressionsToStore, impressionsToListener, deduped } = processStrategy(strategyDebugCS, impressions));
    
    expect(impressionsToStore).toStrictEqual(augmentedImpressions);
    expect(impressionsToListener).toStrictEqual(augmentedImpressions);
    expect(deduped).toStrictEqual(0);
    
  });
});
