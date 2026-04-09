import { IDefinitionChangesResponse, ISegmentChangesResponse, IMembershipsResponse } from '../../../dtos/types';
import { IResponse } from '../../../services/types';

export type IDefinitionChangesFetcher = (
  since: number,
  noCache?: boolean,
  till?: number,
  rbSince?: number,
  decorator?: (promise: Promise<IResponse>) => Promise<IResponse>
) => Promise<IDefinitionChangesResponse>

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
  till?: number,
  decorator?: (promise: Promise<IResponse>) => Promise<IResponse>
) => Promise<IMembershipsResponse>
