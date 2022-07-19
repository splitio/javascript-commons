import { ImpressionDTO } from '../../../types';
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
export const impression12 = {
  feature: 'qc_team',
  keyName: 'emma@split.io',
  treatment: 'no',
  time: Date.now(),
  bucketingKey: 'impr_bucketing_2',
  label: 'default rule'
} as ImpressionDTO;
export const impression13 = {
  feature: 'qc_team',
  keyName: 'emma@split.io',
  treatment: 'no',
  time: Date.now(),
  bucketingKey: 'impr_bucketing_2',
  label: 'default rule'
} as ImpressionDTO;

export function processStrategy(strategy: IStrategy, impressions: ImpressionDTO[]) {  
  return strategy.process(impressions);
}
