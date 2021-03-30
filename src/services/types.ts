export type IRequestOptions = {
  method?: string,
  headers?: Record<string, string>,
  body?: string
};

// Reduced version of Fetch API
export type IFetch = (url: string, options?: IRequestOptions) => Promise<Response>

export type ISplitHttpClient = (url: string, options?: IRequestOptions, logErrorsAsInfo?: boolean) => Promise<Response>

export type IFetchAuth = (userKeys?: string[]) => Promise<Response>

export type IFetchSplitChanges = (since: number, noCache?: boolean) => Promise<Response>

export type IFetchSegmentChanges = (since: number, segmentName: string, noCache?: boolean) => Promise<Response>

export type IFetchMySegments = (userMatchingKey: string, noCache?: boolean) => Promise<Response>

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
