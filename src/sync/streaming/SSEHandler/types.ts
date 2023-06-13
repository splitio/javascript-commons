import { ControlType } from '../constants';
import { MY_SEGMENTS_UPDATE, MY_SEGMENTS_UPDATE_V2, SEGMENT_UPDATE, SPLIT_UPDATE, SPLIT_KILL, CONTROL, OCCUPANCY } from '../types';

export interface IMySegmentsUpdateData {
  type: MY_SEGMENTS_UPDATE,
  changeNumber: number,
  includesPayload: boolean,
  segmentList?: string[]
}

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

export interface IMySegmentsUpdateV2Data {
  type: MY_SEGMENTS_UPDATE_V2,
  changeNumber: number,
  segmentName: string,
  c: Compression,
  d: string,
  u: UpdateStrategy,
}

export interface ISegmentUpdateData {
  type: SEGMENT_UPDATE,
  changeNumber: number,
  segmentName: string
}

export interface ISplitUpdateData {
  type: SPLIT_UPDATE,
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

export type INotificationData = IMySegmentsUpdateData | IMySegmentsUpdateV2Data | ISegmentUpdateData | ISplitUpdateData | ISplitKillData | IControlData | IOccupancyData
export type INotificationMessage = { parsedData: INotificationData, channel: string, timestamp: number, data: string }
export type INotificationError = Event & { parsedData?: any, message?: string }
