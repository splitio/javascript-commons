import { ISplit } from '../../dtos/types';
import { IReadinessManager } from '../../readiness/types';
import { IStorageSync } from '../../storages/types';
import { ITask, ISyncTask } from '../types';

export interface ISplitsSyncTask extends ISyncTask<[noCache?: boolean, till?: number, splitUpdateNotification?: { payload: ISplit, changeNumber: number }], boolean> { }

export interface ISegmentsSyncTask extends ISyncTask<[fetchOnlyNew?: boolean, segmentName?: string, noCache?: boolean, till?: number], boolean> { }

export type MySegmentsData = string[] | {
  /* segment name */
  name: string,
  /* action: `true` for add, and `false` for delete */
  add: boolean
}

export interface IMySegmentsSyncTask extends ISyncTask<[segmentsData?: MySegmentsData, noCache?: boolean], boolean> { }

export interface IPollingManager extends ITask {
  syncAll(): Promise<any>
  splitsSyncTask: ISplitsSyncTask
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
