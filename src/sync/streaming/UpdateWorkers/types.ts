import { ISplitKillData, ISplitUpdateData } from '../SSEHandler/types';

export interface IUpdateWorker<T extends any[]> {
  stop(): void // clear scheduled tasks (backoff)
  put(...args: T): void // handle new update event
}

export interface IDefinitionsUpdateWorker extends IUpdateWorker<[updateData: ISplitUpdateData]> {
  killDefinition: (event: ISplitKillData) => void
}
