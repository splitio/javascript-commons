export type IFetch = (
  url: string,
  options?: {
    method?: string,
    headers?: Record<string, string>,
    credentials?: 'include' | 'omit',
    body?: string
  }
) => Promise<Response>

export type ISplitHttpClient = (url: string, method?: string, body?: string, logErrorsAsInfo?: boolean, extraHeaders?: Record<string, string>) => Promise<Response>

export type IFetchAuth = (userKeys?: string[]) => Promise<Response>

export type IFetchSplitChanges = (since: number) => Promise<Response>

export type IFetchSegmentChanges = (since: number, segmentName: string) => Promise<Response>

export type IFetchMySegments = (userMatchingKey: string) => Promise<Response>

export type IPostEventsBulk = (body: string) => Promise<Response>

export type IPostTestImpressionsBulk = (body: string) => Promise<Response>

export type IPostTestImpressionsCount = (body: string) => Promise<Response>

export type IPostMetricsCounters = (body: string) => Promise<Response>

export type IPostMetricsTimes = (body: string) => Promise<Response>

export interface ISplitApi {
  fetchAuth: IFetchAuth
  fetchSplitChanges: IFetchSplitChanges
  fetchSegmentChanges: IFetchSegmentChanges
  fetchMySegments: IFetchMySegments
  postEventsBulk: IPostEventsBulk
  postTestImpressionsBulk: IPostTestImpressionsBulk
  postTestImpressionsCount: IPostTestImpressionsCount
  postMetricsCounters: IPostMetricsCounters
  postMetricsTimes: IPostMetricsTimes
}
