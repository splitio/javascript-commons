import Backoff from '../../../utils/Backoff';

export interface IUpdateWorker {
  readonly backoff: Backoff,
  put(changeNumber: number, ...args: any[]): void
}
