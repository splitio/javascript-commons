import { ImpressionDTO } from '../../types';

export function buildKey(impression: ImpressionDTO) {
  return `${impression.keyName}:${impression.feature}:${impression.treatment}:${impression.label}:${impression.changeNumber}`;
}
