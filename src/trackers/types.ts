import { SplitIO, ImpressionDTO } from '../types';
import { StreamingEventType, Method, OperationType, UpdatesFromSSEEnum } from '../sync/submitters/types';
import { IEventsCacheBase } from '../storages/types';
import { NetworkError } from '../services/types';

/** Events tracker */

export interface IEventsHandler {
  handleEvent(eventData: SplitIO.EventData): any
}

export type IEventTracker = IEventsCacheBase

/** Impressions tracker */

export interface IImpressionsHandler {
  handleImpression(impressionData: SplitIO.ImpressionData): any
}

export interface IImpressionsTracker {
  track(impressions: ImpressionDTO[], attributes?: SplitIO.Attributes): void
}

/** Telemetry tracker */
export type AUTH_REJECTION = 80;

export interface ITelemetryTracker {
  /**
   * Creates a telemetry evaluator tracker, to record Latencies, Exceptions and NonReadyUsage of client operations (getTreatments and track method calls)
   */
  trackEval(method: Method): (label?: string) => void
  /**
   * Creates a telemetry runtime tracker, to record Latencies and Exceptions of HTTP requests
   */
  trackHttp(method: OperationType): (error?: NetworkError) => void
  /**
   * Records session length
   */
  sessionLength(): void
  /**
   * Records streaming event
   */
  streamingEvent(e: StreamingEventType | AUTH_REJECTION, d?: number): void
  /**
   * Records tag
   */
  addTag(tag: string): void
  /**
   * Records updates from sse
   */
  trackUpdatesFromSSE(type: UpdatesFromSSEEnum): void;
}

export interface IFilterAdapter {
  add(key: string, featureName: string): boolean;
  contains(key: string, featureName: string): boolean;
  clear(): void;
  refreshRate?: number;
}

export interface IImpressionSenderAdapter {
  recordUniqueKeys(data: Object): void;
  recordImpressionCounts(data: Object): void
}

/** Unique keys tracker */
export interface IUniqueKeysTracker {
  stop(): void;
  track(key: string, featureName: string): void;
}

export interface IStrategyResult {
  impressionsToStore: ImpressionDTO[],
  impressionsToListener: ImpressionDTO[],
  deduped: number
}

export interface IStrategy {
  process(impressions:  ImpressionDTO[]): IStrategyResult
}
