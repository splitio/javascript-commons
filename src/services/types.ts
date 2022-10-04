export type IRequestOptions = {
	method?: string,
	headers?: Record<string, string>,
	body?: string
};

export type IResponse = {
	ok: boolean,
	status: number,
	json: () => Promise<any>, // Used to parse OK response body. Promise rejects if body cannot be parsed
	text: () => Promise<string>, // Used to read Not OK response body. Promise never rejects

	/** Other available properties when using Unfetch */
	// statusText: string, // `undefined` in Web fetch since HTTP/2 doesn't have reason phrases anymore. `node-fetch` overwrites it depending on the status code
	// url: string,
	// blob: () => Promise<Blob>,
	// clone: () => IResponse,
	// headers: {
	// 	keys: () => string[],
	// 	entries: () => Array<[string, string]>,
	// 	get: (key: string) => string | undefined,
	// 	has: (key: string) => boolean,
	// }
}

export type NetworkError = Error & { statusCode?: number }

// Reduced version of Fetch API
export type IFetch = (url: string, options?: IRequestOptions) => Promise<IResponse>

// IFetch specialization
export type IHealthCheckAPI = () => Promise<boolean>

export type ISplitHttpClient = (url: string, options?: IRequestOptions, latencyTracker?: (error?: NetworkError) => void, logErrorsAsInfo?: boolean) => Promise<IResponse>

export type IFetchAuth = (userKeys?: string[]) => Promise<IResponse>

export type IFetchSplitChanges = (since: number, noCache?: boolean, till?: number) => Promise<IResponse>

export type IFetchSegmentChanges = (since: number, segmentName: string, noCache?: boolean, till?: number) => Promise<IResponse>

export type IFetchMySegments = (userMatchingKey: string, noCache?: boolean) => Promise<IResponse>

export type IPostEventsBulk = (body: string, headers?: Record<string, string>) => Promise<IResponse>

export type IPostUniqueKeysBulkCs = (body: string, headers?: Record<string, string>) => Promise<IResponse>

export type IPostUniqueKeysBulkSs = (body: string, headers?: Record<string, string>) => Promise<IResponse>

export type IPostTestImpressionsBulk = (body: string, headers?: Record<string, string>) => Promise<IResponse>

export type IPostTestImpressionsCount = (body: string, headers?: Record<string, string>) => Promise<IResponse>

export type IPostMetricsConfig = (body: string, headers?: Record<string, string>) => Promise<IResponse>

export type IPostMetricsUsage = (body: string, headers?: Record<string, string>) => Promise<IResponse>

export interface ISplitApi {
	getSdkAPIHealthCheck: IHealthCheckAPI
	getEventsAPIHealthCheck: IHealthCheckAPI
	fetchAuth: IFetchAuth
	fetchSplitChanges: IFetchSplitChanges
	fetchSegmentChanges: IFetchSegmentChanges
	fetchMySegments: IFetchMySegments
	postEventsBulk: IPostEventsBulk
	postUniqueKeysBulkCs: IPostUniqueKeysBulkCs
	postUniqueKeysBulkSs: IPostUniqueKeysBulkSs
	postTestImpressionsBulk: IPostTestImpressionsBulk
	postTestImpressionsCount: IPostTestImpressionsCount
	postMetricsConfig: IPostMetricsConfig
	postMetricsUsage: IPostMetricsUsage
}

// Minimal version of EventSource API used by the SDK
interface EventSourceEventMap {
	'error': Event
	'message': MessageEvent
	'open': Event
}

interface IEventSource {
	addEventListener<K extends keyof EventSourceEventMap>(type: K, listener: (this: IEventSource, ev: EventSourceEventMap[K]) => any): void
	close(): void
}

export type IEventSourceConstructor = new (url: string, eventSourceInitDict?: any) => IEventSource
