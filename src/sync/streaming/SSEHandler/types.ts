import { ControlType } from '../constants';
import { SEGMENT_UPDATE, SPLIT_UPDATE, SPLIT_KILL, CONTROL, OCCUPANCY, MEMBERSHIPS_LS_UPDATE, MEMBERSHIPS_MS_UPDATE, RB_SEGMENT_UPDATE } from '../types';

export enum Compression {
  None = 0,
  Gzip = 1,
  Zlib = 2
}

export enum UpdateStrategy {
  UnboundedFetchRequest = 0,
  BoundedFetchRequest = 1,
  KeyList = 2,
  SegmentRemoval = 3
}

export interface KeyList {
  a?: string[], // decimal hash64 of user keys
  r?: string[], // decimal hash64 of user keys
}

interface IMembershipUpdateData<T extends string> {
  type: T,
  cn: number,
  n?: string[],
  c?: Compression,
  d?: string,
  u: UpdateStrategy,
  i?: number, // time interval in millis
  h?: number, // hash function
  s?: number, // seed for hash function
}

export interface IMembershipMSUpdateData extends IMembershipUpdateData<MEMBERSHIPS_MS_UPDATE> { }

export interface IMembershipLSUpdateData extends IMembershipUpdateData<MEMBERSHIPS_LS_UPDATE> { }

export interface ISegmentUpdateData {
  type: SEGMENT_UPDATE,
  changeNumber: number,
  segmentName: string
}

export interface ISplitUpdateData {
  type: SPLIT_UPDATE | RB_SEGMENT_UPDATE,
  changeNumber: number,
  pcn?: number,
  d?: string,
  c?: Compression
}

export interface ISplitKillData {
  type: SPLIT_KILL,
  changeNumber: number,
  splitName: string,
  defaultTreatment: string
}

export interface IControlData {
  type: CONTROL,
  controlType: ControlType
}

export interface IOccupancyData {
  type: OCCUPANCY, // Added by `NotificationParser::messageParser` function for consistency with other notification types
  metrics: {
    publishers: number
  }
}

export type INotificationData = IMembershipMSUpdateData | IMembershipLSUpdateData | ISegmentUpdateData | ISplitUpdateData | ISplitKillData | IControlData | IOccupancyData
export type INotificationMessage = { parsedData: INotificationData, channel: string, timestamp: number, data: string }
export type INotificationError = Event & { parsedData?: any, message?: string }
