import SplitIO from '../../../types/splitio';

export interface IImpressionObserver {
  testAndSet(impression: SplitIO.ImpressionDTO): number | undefined
}
