import { IRBSegment, IDefinition } from '../../dtos/types';
import { IReadinessManager } from '../../readiness/types';
import { IStorageSync } from '../../storages/types';
import { MEMBERSHIPS_LS_UPDATE, MEMBERSHIPS_MS_UPDATE } from '../streaming/types';
import { ITask, ISyncTask } from '../types';

export type InstantUpdate = {
  payload: IDefinition | IRBSegment,
  /**
   * Environment-scoped change number to track as the storage change number.
   * If not provided, the storage change number is preserved. That's the case of config instant
   * updates, where the notification change number is scoped to the config rather than to the
   * environment.
   */
  changeNumber?: number,
  type: string
};

/**
 * `pcn` of CONFIG_UPDATE and RB_SEGMENT_UPDATE notifications for the Configs SDK, used as lower bounds for the `since` and `rbSince` fetch params.
 * Added for robustness, although in practice `pcn` should never be lower than the current storage change number.
 */
export type PreviousChangeNumbers = {
  since?: number, // `pcn` of CONFIG_UPDATE notifications
  rbSince?: number // `pcn` of RB_SEGMENT_UPDATE notifications
};

export interface IDefinitionsSyncTask extends ISyncTask<[noCache?: boolean, till?: number, instantUpdate?: InstantUpdate, pcns?: PreviousChangeNumbers], boolean> { }

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
