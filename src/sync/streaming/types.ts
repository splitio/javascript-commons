import { IMySegmentsUpdateData, IMySegmentsUpdateV2Data } from './SSEHandler/types';
import { ITask } from '../types';
import { IPollingManager, ISegmentsSyncTask } from '../polling/types';
import { IReadinessManager } from '../../readiness/types';
import { IFetchAuth } from '../../services/types';
import { IStorageSync } from '../../storages/types';
import { IEventEmitter, ISettings } from '../../types';
import { IPlatform } from '../../sdkFactory/types';

// Internal SDK events, subscribed by SyncManager and PushManager
export type PUSH_SUBSYSTEM_UP = 'PUSH_SUBSYSTEM_UP'
export type PUSH_SUBSYSTEM_DOWN = 'PUSH_SUBSYSTEM_DOWN'
export type PUSH_NONRETRYABLE_ERROR = 'PUSH_NONRETRYABLE_ERROR'
export type PUSH_RETRYABLE_ERROR = 'PUSH_RETRYABLE_ERROR'

// Update-type push notifications, handled by NotificationProcessor
export type MY_SEGMENTS_UPDATE = 'MY_SEGMENTS_UPDATE';
export type MY_SEGMENTS_UPDATE_V2 = 'MY_SEGMENTS_UPDATE_V2';
export type SEGMENT_UPDATE = 'SEGMENT_UPDATE';
export type SPLIT_KILL = 'SPLIT_KILL';
export type SPLIT_UPDATE = 'SPLIT_UPDATE';

// Control-type push notifications, handled by NotificationKeeper
export type CONTROL = 'CONTROL';
export type OCCUPANCY = 'OCCUPANCY';

export type STREAMING_RESET = 'STREAMING_RESET';

export type IPushEvent = PUSH_SUBSYSTEM_UP | PUSH_SUBSYSTEM_DOWN | PUSH_NONRETRYABLE_ERROR | PUSH_RETRYABLE_ERROR | MY_SEGMENTS_UPDATE | MY_SEGMENTS_UPDATE_V2 | SEGMENT_UPDATE | SPLIT_UPDATE | SPLIT_KILL | STREAMING_RESET

/**
 * EventEmitter used as Feedback Loop between the SyncManager and PushManager,
 * where the latter pushes messages and the former consumes it
 */
export interface IPushEventEmitter extends IEventEmitter {
  once<T extends IPushEvent>(event: T, listener: (...args:
    T extends MY_SEGMENTS_UPDATE ? [parsedData: IMySegmentsUpdateData, channel: string] :
    T extends MY_SEGMENTS_UPDATE_V2 ? [parsedData: IMySegmentsUpdateV2Data] :
    T extends SEGMENT_UPDATE ? [changeNumber: number, segmentName: string] :
    T extends SPLIT_UPDATE ? [changeNumber: number] :
    T extends SPLIT_KILL ? [changeNumber: number, splitName: string, defaultTreatment: string] :
    any[]) => void): this;

  on<T extends IPushEvent>(event: T, listener: (...args:
    T extends MY_SEGMENTS_UPDATE ? [parsedData: IMySegmentsUpdateData, channel: string] :
    T extends MY_SEGMENTS_UPDATE_V2 ? [parsedData: IMySegmentsUpdateV2Data] :
    T extends SEGMENT_UPDATE ? [changeNumber: number, segmentName: string] :
    T extends SPLIT_UPDATE ? [changeNumber: number] :
    T extends SPLIT_KILL ? [changeNumber: number, splitName: string, defaultTreatment: string] :
    any[]) => void): this;

  emit<T extends IPushEvent>(event: T, ...args:
    T extends MY_SEGMENTS_UPDATE ? [parsedData: IMySegmentsUpdateData, channel: string] :
    T extends MY_SEGMENTS_UPDATE_V2 ? [parsedData: IMySegmentsUpdateV2Data] :
    T extends SEGMENT_UPDATE ? [changeNumber: number, segmentName: string] :
    T extends SPLIT_UPDATE ? [changeNumber: number] :
    T extends SPLIT_KILL ? [changeNumber: number, splitName: string, defaultTreatment: string] :
    any[]): boolean;
}

/**
 * PushManager for server-side
 */
export interface IPushManager extends ITask, IPushEventEmitter { }

/**
 * PushManager for client-side with support for multiple clients
 */
export interface IPushManagerCS extends IPushManager {
  add(userKey: string, mySegmentsSyncTask: ISegmentsSyncTask): void,
  remove(userKey: string): void
}

/**
 * Signature of push manager factory/constructor
 */
export type IPushManagerFactoryParams = [
  pollingManager: IPollingManager,
  storage: IStorageSync,
  readiness: IReadinessManager,
  fetchAuth: IFetchAuth,
  platform: IPlatform,
  settings: ISettings
]
