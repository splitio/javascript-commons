import { ImpressionDTO } from '../../../types';
import { ISet, _Set } from '../../../utils/lang/sets';
import { IStrategy } from '../../types';

export const impression1 = {
  feature: 'qc_team',
  keyName: 'emma@split.io',
  treatment: 'no',
  time: Date.now(),
  bucketingKey: 'impr_bucketing_2',
  label: 'default rule'
} as ImpressionDTO;
export const impression2 = {
  feature: 'qc_team_2',
  keyName: 'emma@split.io',
  treatment: 'yes',
  time: Date.now(),
  bucketingKey: 'impr_bucketing_2',
  label: 'default rule'
} as ImpressionDTO;

export function processStrategy(strategy: IStrategy, impressions: ImpressionDTO[], isClientSide?: boolean) {  
  return strategy.process(impressions, isClientSide);
}

export function getExpected(impressions: ImpressionDTO[], clientSide: boolean) {
  const expectedPop: { [key: string]: ISet<string> } = {};

  impressions.forEach(impression => {
    const key = clientSide ? impression.keyName : impression.feature;
    const value = clientSide ? impression.feature : impression.keyName;
    
    if (!expectedPop[key]) expectedPop[key] = new _Set();
    expectedPop[key].add(value);
  });
  return expectedPop;
}
