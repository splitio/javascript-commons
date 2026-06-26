import { IRBSegment, IDefinition } from '../../dtos/types';
import { IReadinessManager } from '../../readiness/types';
import { IStorageSync } from '../../storages/types';
import { MEMBERSHIPS_LS_UPDATE, MEMBERSHIPS_MS_UPDATE } from '../streaming/types';
import { ITask, ISyncTask } from '../types';

export interface IDefinitionsSyncTask extends ISyncTask<[noCache?: boolean, till?: number, definitionUpdateNotification?: { payload: IDefinition | IRBSegment, changeNumber: number }], boolean> { }

export interface ISegmentsSyncTask extends ISyncTask<[fetchOnlyNew?: boolean, segmentName?: string, noCache?: boolean, till?: number], boolean> { }

export type MySegmentsData = {
  type: MEMBERSHIPS_MS_UPDATE | MEMBERSHIPS_LS_UPDATE
  cn: number
  added: string[]
  removed: string[]
}

export interface IMySegmentsSyncTask extends ISyncTask<[segmentsData?: MySegmentsData, noCache?: boolean, till?: number], boolean> { }

export interface IPollingManager extends ITask {
  syncAll(): Promise<any>
  definitionsSyncTask: IDefinitionsSyncTask
  segmentsSyncTask: ISyncTask
}

/**
 * PollingManager for client-side with support for multiple clients
 */
export interface IPollingManagerCS extends IPollingManager {
  add(matchingKey: string, readiness: IReadinessManager, storage: IStorageSync): IMySegmentsSyncTask
  remove(matchingKey: string): void;
  get(matchingKey: string): IMySegmentsSyncTask | undefined
}
