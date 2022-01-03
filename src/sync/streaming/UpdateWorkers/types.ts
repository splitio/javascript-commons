import { Backoff } from '../../../utils/Backoff';

export interface IUpdateWorker {
  readonly backoff: Backoff,
  put(...args: any[]): void
}
