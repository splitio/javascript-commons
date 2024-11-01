import SplitIO from '../../../types/splitio';

export function buildKey(impression: SplitIO.ImpressionDTO) {
  return `${impression.keyName}:${impression.feature}:${impression.treatment}:${impression.label}:${impression.changeNumber}`;
}
