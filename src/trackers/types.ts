import { ImpressionDTO, EventData, ImpressionData, Attributes } from '../types';
import { StreamingEventType, Method, OperationType } from '../sync/submitters/types';
import { IEventsCacheBase } from '../storages/types';
import { NetworkError } from '../services/types';

/** Events tracker */

export interface IEventsHandler {
  handleEvent(eventData: EventData): any
}

export type IEventTracker = IEventsCacheBase

/** Impressions tracker */

export interface IImpressionsHandler {
  handleImpression(impressionData: ImpressionData): any
}

export interface IImpressionsTracker {
  track(impressions: ImpressionDTO[], attributes?: Attributes): void
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
}
