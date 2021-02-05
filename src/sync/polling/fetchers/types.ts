import { ISplitChangesResponse, ISegmentChangesResponse } from '../../../dtos/types';

export type ISplitChangesFetcher = (
  since: number,
  decorator?: (promise: Promise<Response>) => Promise<Response>) => Promise<ISplitChangesResponse>

export type ISegmentChangesFetcher = (
  since: number,
  segmentName: string,
  decorator?: (promise: Promise<ISegmentChangesResponse[]>) => Promise<ISegmentChangesResponse[]>) => Promise<ISegmentChangesResponse[]>

export type IMySegmentsFetcher = (
  decorator?: (promise: Promise<Response>) => Promise<Response>) => Promise<string[]>
