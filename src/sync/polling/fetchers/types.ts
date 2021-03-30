import { ISplitChangesResponse, ISegmentChangesResponse } from '../../../dtos/types';

export type ISplitChangesFetcher = (
  since: number,
  noCache?: boolean,
  decorator?: (promise: Promise<Response>) => Promise<Response>
) => Promise<ISplitChangesResponse>

export type ISegmentChangesFetcher = (
  since: number,
  segmentName: string,
  noCache?: boolean,
  decorator?: (promise: Promise<ISegmentChangesResponse[]>) => Promise<ISegmentChangesResponse[]>
) => Promise<ISegmentChangesResponse[]>

export type IMySegmentsFetcher = (
  noCache?: boolean,
  decorator?: (promise: Promise<Response>) => Promise<Response>
) => Promise<string[]>
