import { ControlType } from '../constants';
import { MY_SEGMENTS_UPDATE, SEGMENT_UPDATE, SPLIT_UPDATE, SPLIT_KILL, CONTROL, OCCUPANCY } from '../types';

export interface IMySegmentsUpdateData {
  type: MY_SEGMENTS_UPDATE,
  changeNumber: number,
  includesPayload: boolean,
  segmentList?: string[]
}

export interface ISegmentUpdateData {
  type: SEGMENT_UPDATE,
  changeNumber: number,
  segmentName: string
}

export interface ISplitUpdateData {
  type: SPLIT_UPDATE,
  changeNumber: number
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

export type INotificationData = IMySegmentsUpdateData | ISegmentUpdateData | ISplitUpdateData | ISplitKillData | IControlData | IOccupancyData
export type INotificationMessage = { parsedData: INotificationData, channel: string, timestamp: number, data: string }
export type INotificationError = Event & { parsedData?: any }
