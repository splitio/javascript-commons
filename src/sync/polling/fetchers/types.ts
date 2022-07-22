import { ISplitChangesResponse, ISegmentChangesResponse } from '../../../dtos/types';
import { IResponse } from '../../../services/types';

export type ISplitChangesFetcher = (
  since: number,
  noCache?: boolean,
  till?: number,
  decorator?: (promise: Promise<IResponse>) => Promise<IResponse>
) => Promise<ISplitChangesResponse>

export type ISegmentChangesFetcher = (
  since: number,
  segmentName: string,
  noCache?: boolean,
  till?: number,
  decorator?: (promise: Promise<ISegmentChangesResponse[]>) => Promise<ISegmentChangesResponse[]>
) => Promise<ISegmentChangesResponse[]>

export type IMySegmentsFetcher = (
  userMatchingKey: string,
  noCache?: boolean,
  decorator?: (promise: Promise<IResponse>) => Promise<IResponse>
) => Promise<string[]>
