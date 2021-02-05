import { IMySegmentsUpdateData, INotificationError } from './SSEHandler/types';
import { ITask } from '../types';
import { IPollingManager, ISegmentsSyncTask } from '../polling/types';
import { IReadinessManager } from '../../readiness/types';
import { IFetchAuth } from '../../services/types';
import { IStorageSync } from '../../storages/types';
import { IEventEmitter, ISettings } from '../../types';
import { IPlatform } from '../../sdkFactory/types';

// Internal SDK events, subscribed by SyncManager and PushManager
export type PUSH_CONNECT = 'PUSH_CONNECT'
export type PUSH_DISCONNECT = 'PUSH_DISCONNECT'
export type PUSH_DISABLED = 'PUSH_DISABLED'
export type SSE_ERROR = 'SSE_ERROR'

// Update-type push notifications, handled by NotificationProcessor
export type MY_SEGMENTS_UPDATE = 'MY_SEGMENTS_UPDATE';
export type SEGMENT_UPDATE = 'SEGMENT_UPDATE';
export type SPLIT_KILL = 'SPLIT_KILL';
export type SPLIT_UPDATE = 'SPLIT_UPDATE';

// Control-type push notifications, handled by NotificationKeeper
export type CONTROL = 'CONTROL';
export type OCCUPANCY = 'OCCUPANCY';

export type IPushEvent = PUSH_CONNECT | PUSH_DISCONNECT | PUSH_DISABLED | SSE_ERROR | MY_SEGMENTS_UPDATE | SEGMENT_UPDATE | SPLIT_UPDATE | SPLIT_KILL

/**
 * EventEmitter used as Feedback Loop between the SyncManager and PushManager,
 * where the latter pushes messages and the former consumes it
 */
export interface IPushEventEmitter extends IEventEmitter {
  once<T extends IPushEvent>(event: T, listener: (...args:
    T extends MY_SEGMENTS_UPDATE ? [parsedData: IMySegmentsUpdateData, channel: string] :
    T extends SEGMENT_UPDATE ? [changeNumber: number, segmentName: string] :
    T extends SPLIT_UPDATE ? [changeNumber: number] :
    T extends SPLIT_KILL ? [changeNumber: number, splitName: string, defaultTreatment: string] :
    T extends SSE_ERROR ? [error: INotificationError] :
    any[]) => void): this;

  on<T extends IPushEvent>(event: T, listener: (...args:
    T extends MY_SEGMENTS_UPDATE ? [parsedData: IMySegmentsUpdateData, channel: string] :
    T extends SEGMENT_UPDATE ? [changeNumber: number, segmentName: string] :
    T extends SPLIT_UPDATE ? [changeNumber: number] :
    T extends SPLIT_KILL ? [changeNumber: number, splitName: string, defaultTreatment: string] :
    T extends SSE_ERROR ? [error: INotificationError] :
    any[]) => void): this;

  emit<T extends IPushEvent>(event: T, ...args:
    T extends MY_SEGMENTS_UPDATE ? [parsedData: IMySegmentsUpdateData, channel: string] :
    T extends SEGMENT_UPDATE ? [changeNumber: number, segmentName: string] :
    T extends SPLIT_UPDATE ? [changeNumber: number] :
    T extends SPLIT_KILL ? [changeNumber: number, splitName: string, defaultTreatment: string] :
    T extends SSE_ERROR ? [error: INotificationError] :
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
