import { IMembershipMSUpdateData, IMembershipLSUpdateData, ISegmentUpdateData, ISplitUpdateData, ISplitKillData, INotificationData } from './SSEHandler/types';
import { ITask } from '../types';
import { IMySegmentsSyncTask } from '../polling/types';
import SplitIO from '../../../types/splitio';
import { ControlType } from './constants';

// Internal SDK events, subscribed by SyncManager and PushManager
export type PUSH_SUBSYSTEM_UP = 'PUSH_SUBSYSTEM_UP'
export type PUSH_SUBSYSTEM_DOWN = 'PUSH_SUBSYSTEM_DOWN'
export type PUSH_NONRETRYABLE_ERROR = 'PUSH_NONRETRYABLE_ERROR'
export type PUSH_RETRYABLE_ERROR = 'PUSH_RETRYABLE_ERROR'

// Update-type push notifications, handled by NotificationProcessor
export type MEMBERSHIPS_MS_UPDATE = 'MEMBERSHIPS_MS_UPDATE';
export type MEMBERSHIPS_LS_UPDATE = 'MEMBERSHIPS_LS_UPDATE';
export type SEGMENT_UPDATE = 'SEGMENT_UPDATE';
export type SPLIT_KILL = 'SPLIT_KILL';
export type SPLIT_UPDATE = 'SPLIT_UPDATE';
export type RB_SEGMENT_UPDATE = 'RB_SEGMENT_UPDATE';

// Control-type push notifications, handled by NotificationKeeper
export type CONTROL = 'CONTROL';
export type OCCUPANCY = 'OCCUPANCY';

export type IPushEvent = PUSH_SUBSYSTEM_UP | PUSH_SUBSYSTEM_DOWN | PUSH_NONRETRYABLE_ERROR | PUSH_RETRYABLE_ERROR | MEMBERSHIPS_MS_UPDATE | MEMBERSHIPS_LS_UPDATE | SEGMENT_UPDATE | SPLIT_UPDATE | SPLIT_KILL | RB_SEGMENT_UPDATE | ControlType.STREAMING_RESET

type IParsedData<T extends IPushEvent> =
  T extends MEMBERSHIPS_MS_UPDATE ? IMembershipMSUpdateData :
  T extends MEMBERSHIPS_LS_UPDATE ? IMembershipLSUpdateData :
  T extends SEGMENT_UPDATE ? ISegmentUpdateData :
  T extends SPLIT_UPDATE | RB_SEGMENT_UPDATE ? ISplitUpdateData :
  T extends SPLIT_KILL ? ISplitKillData : INotificationData;

/**
 * EventEmitter used as Feedback Loop between the SyncManager and PushManager,
 * where the latter pushes messages and the former consumes it
 */
export interface IPushEventEmitter extends SplitIO.IEventEmitter {
  once<T extends IPushEvent>(event: T, listener: (parsedData: IParsedData<T>) => void): this;
  on<T extends IPushEvent>(event: T, listener: (parsedData: IParsedData<T>) => void): this;
  emit<T extends IPushEvent>(event: T, parsedData?: IParsedData<T>): boolean;
}

/**
 * PushManager
 */
export interface IPushManager extends ITask, IPushEventEmitter {
  // Methods used in client-side, to support multiple clients
  add(userKey: string, mySegmentsSyncTask: IMySegmentsSyncTask): void,
  remove(userKey: string): void
}
