import SplitIO from '../../../../types/splitio';

export const impression1 = {
  feature: 'qc_team',
  keyName: 'emma@split.io',
  treatment: 'no',
  time: Date.now(),
  bucketingKey: 'impr_bucketing_2',
  label: 'default rule'
} as SplitIO.ImpressionDTO;
export const impression2 = {
  feature: 'qc_team_2',
  keyName: 'emma@split.io',
  treatment: 'yes',
  time: Date.now(),
  bucketingKey: 'impr_bucketing_2',
  label: 'default rule'
} as SplitIO.ImpressionDTO;
