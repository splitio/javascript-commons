/* eslint-disable no-use-before-define */
import { IMetadata } from '../../dtos/types';
import { SplitIO } from '../../types';
import { IMap } from '../../utils/lang/maps';
import { ISyncTask } from '../types';

export type ImpressionsPayload = {
  /** Split name */
  f: string,
  /** Key Impressions */
  i: {
    /** User Key */
    k: string;
    /** Treatment */
    t: string;
    /** Timestamp */
    m: number;
    /** ChangeNumber */
    c: number;
    /** Rule label */
    r?: string;
    /** Bucketing Key */
    b?: string;
    /** Previous time */
    pt?: number;
  }[]
}[]

export type ImpressionCountsPayload = {
  pf: {
    /** Split name */
    f: string
    /** Time Frame */
    m: number
    /** Count */
    rc: number
  }[]
}

export type UniqueKeysItemSs = {
  /** Split name */
  f: string
  /** keyNames */
  ks: string[]
}

export type UniqueKeysPayloadSs = {
  keys: UniqueKeysItemSs[]
}

export type UniqueKeysPayloadCs = {
  keys: {
    /** keyNames */
    k: string
    /** Split name */
    fs: string[]
  }[]
}

export type StoredImpressionWithMetadata = {
  /** Metadata */
  m: IMetadata,
  /** Stored impression */
  i: {
    /** keyName */
    k: string,
    /** bucketingKey */
    b?: string,
    /** Split name */
    f: string,
    /** treatment */
    t: string,
    /** label */
    r: string,
    /** changeNumber */
    c: number,
    /** time */
    m: number
    /** previous time */
    pt?: number
  }
}

export type StoredEventWithMetadata = {
  /** Metadata */
  m: IMetadata,
  /** Stored event */
  e: SplitIO.EventData
}

export type MultiMethodLatencies = IMap<string, MethodLatencies>

export type MultiMethodExceptions = IMap<string, MethodExceptions>

export type MultiConfigs = IMap<string, TelemetryConfigStats>

/**
 * Telemetry usage stats
 */

export type QUEUED = 0;
export type DROPPED = 1;
export type DEDUPED = 2;
export type ImpressionDataType = QUEUED | DROPPED | DEDUPED
export type EventDataType = QUEUED | DROPPED;
export type UpdatesFromSSEEnum = SPLITS | MY_SEGMENT;

export type SPLITS = 'sp';
export type IMPRESSIONS = 'im';
export type IMPRESSIONS_COUNT = 'ic';
export type EVENTS = 'ev';
export type TELEMETRY = 'te';
export type TOKEN = 'to';
export type SEGMENT = 'se';
export type MY_SEGMENT = 'ms';
export type OperationType = SPLITS | IMPRESSIONS | IMPRESSIONS_COUNT | EVENTS | TELEMETRY | TOKEN | SEGMENT | MY_SEGMENT;

export type LastSync = Partial<Record<OperationType, number | undefined>>
export type HttpErrors = Partial<Record<OperationType, { [statusCode: string]: number }>>
export type HttpLatencies = Partial<Record<OperationType, Array<number>>>

export type TREATMENT = 't';
export type TREATMENTS = 'ts';
export type TREATMENT_WITH_CONFIG = 'tc';
export type TREATMENTS_WITH_CONFIG = 'tcs';
export type TRACK = 'tr';
export type Method = TREATMENT | TREATMENTS | TREATMENT_WITH_CONFIG | TREATMENTS_WITH_CONFIG | TRACK;

export type MethodLatencies = Partial<Record<Method, Array<number>>>;

export type MethodExceptions = Partial<Record<Method, number>>;

export type CONNECTION_ESTABLISHED = 0;
export type OCCUPANCY_PRI = 10;
export type OCCUPANCY_SEC = 20;
export type STREAMING_STATUS = 30;
export type SSE_CONNECTION_ERROR = 40;
export type TOKEN_REFRESH = 50;
export type ABLY_ERROR = 60;
export type SYNC_MODE_UPDATE = 70;
export type StreamingEventType = CONNECTION_ESTABLISHED | OCCUPANCY_PRI | OCCUPANCY_SEC | STREAMING_STATUS | SSE_CONNECTION_ERROR | TOKEN_REFRESH | ABLY_ERROR | SYNC_MODE_UPDATE;

export type StreamingEvent = {
  e: StreamingEventType, // eventType
  d?: number, // eventData
  t: number, // timestamp
}

// 'telemetry.latencias' and 'telemetry.exceptions' Redis/Pluggable keys
export type TelemetryUsageStats = {
  mL?: MethodLatencies, // clientMethodLatencies
  mE?: MethodExceptions, // methodExceptions
}

// amount of instant updates that we are doing by avoiding fetching to Split servers
export type UpdatesFromSSE = {
  sp: number, // splits
  ms?: number, // my segments
}

// 'metrics/usage' JSON request body
export type TelemetryUsageStatsPayload = TelemetryUsageStats & {
  lS: LastSync, // lastSynchronization
  hE: HttpErrors, // httpErrors
  hL: HttpLatencies, // httpLatencies
  tR: number, // tokenRefreshes
  aR: number, // authRejections
  iQ: number, // impressionsQueued
  iDe: number, // impressionsDeduped
  iDr: number, // impressionsDropped
  spC?: number, // splitCount
  seC?: number, // segmentCount
  skC?: number, // segmentKeyCount
  sL?: number, // sessionLengthMs
  eQ: number, // eventsQueued
  eD: number, // eventsDropped
  sE: Array<StreamingEvent>, // streamingEvents
  t?: Array<string>, // tags
  ufs?: UpdatesFromSSE, //UpdatesFromSSE
}

/**
 * Telemetry config stats
 */

export type STANDALONE_ENUM = 0;
export type CONSUMER_ENUM = 1;
export type CONSUMER_PARTIAL_ENUM = 2;
export type OperationMode = STANDALONE_ENUM | CONSUMER_ENUM | CONSUMER_PARTIAL_ENUM

export type OPTIMIZED_ENUM = 0;
export type DEBUG_ENUM = 1;
export type NONE_ENUM = 2;
export type ImpressionsMode = OPTIMIZED_ENUM | DEBUG_ENUM | NONE_ENUM;

export type RefreshRates = {
  sp: number, // splits
  se?: number, // segments
  ms?: number, // mySegments
  im: number, // impressions
  ev: number, // events
  te: number, // telemetry
}

export type UrlOverrides = {
  s: boolean, // sdkUrl
  e: boolean, // events
  a: boolean, // auth
  st: boolean, // stream
  t: boolean, // telemetry
}

// 'telemetry.init' Redis/Pluggable key
export type TelemetryConfigStats = {
  oM: OperationMode, // operationMode
  st: 'memory' | 'redis' | 'pluggable' | 'localstorage', // storage
  aF: number, // activeFactories
  rF: number, // redundantActiveFactories
  t?: Array<string>, // tags
}

// 'metrics/config' JSON request body
export type TelemetryConfigStatsPayload = TelemetryConfigStats & {
  sE: boolean, // streamingEnabled
  rR: RefreshRates, // refreshRates
  uO: UrlOverrides, // urlOverrides
  iQ: number, // impressionsQueueSize
  eQ: number, // eventsQueueSize
  iM: ImpressionsMode, // impressionsMode
  iL: boolean, // impressionsListenerEnabled
  hP: boolean, // httpProxyDetected
  tR: number, // timeUntilSDKReady
  tC?: number, // timeUntilSDKReadyFromCache
  nR: number, // SDKNotReadyUsage
  i?: Array<string>, // integrations
  uC: number, // userConsent
}

export interface ISubmitterManager extends ISyncTask {
  start(onlyTelemetry?: boolean): void,
  stop(allExceptTelemetry?: boolean): void,
  execute(onlyTelemetry?: boolean): Promise<any>
}
