import { ImpressionDTO } from '../../types';

export interface IImpressionObserver {
  testAndSet(impression: ImpressionDTO): number | undefined
}
