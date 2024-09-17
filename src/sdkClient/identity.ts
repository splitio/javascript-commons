import { SplitIO } from '../types';

export function buildInstanceId(key: SplitIO.SplitKey, trafficType?: string) { // @ts-ignore
  return `${key.matchingKey ? key.matchingKey : key}-${key.bucketingKey ? key.bucketingKey : key}-${trafficType ? trafficType : ''}`;
}
