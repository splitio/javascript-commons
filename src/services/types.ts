export type IRequestOptions = {
	method?: string,
	headers?: Record<string, string>,
	body?: string
};

export type IResponse = {
	ok: boolean,
	status: number,
	json: () => Promise<any>,

	/** Other available properties when using Unfetch */
	// statusText: string,
	// url: string,
	// text: () => Promise<string>,
	// blob: () => Promise<Blob>,
	// clone: () => IResponse,
	// headers: {
	// 	keys: () => string[],
	// 	entries: () => Array<[string, string]>,
	// 	get: (key: string) => string | undefined,
	// 	has: (key: string) => boolean,
	// }
}

// Reduced version of Fetch API
export type IFetch = (url: string, options?: IRequestOptions) => Promise<IResponse>

// IFetch specialization
export type ISplitHttpClient = (url: string, options?: IRequestOptions, logErrorsAsInfo?: boolean) => Promise<IResponse>

export type IFetchAuth = (userKeys?: string[]) => Promise<IResponse>

export type IFetchSplitChanges = (since: number, noCache?: boolean) => Promise<IResponse>

export type IFetchSegmentChanges = (since: number, segmentName: string, noCache?: boolean) => Promise<IResponse>

export type IFetchMySegments = (userMatchingKey: string, noCache?: boolean) => Promise<IResponse>

export type IPostEventsBulk = (body: string) => Promise<IResponse>

export type IPostTestImpressionsBulk = (body: string) => Promise<IResponse>

export type IPostTestImpressionsCount = (body: string) => Promise<IResponse>

export type IPostMetricsCounters = (body: string) => Promise<IResponse>

export type IPostMetricsTimes = (body: string) => Promise<IResponse>

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
