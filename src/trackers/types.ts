import { SplitIO, ImpressionDTO } from '../types';
import { Method } from '../sync/submitters/types';
import { IEventsCacheBase } from '../storages/types';

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

export interface ITelemetryTracker {
  /**
   * Creates a telemetry evaluator tracker, to record Latencies, Exceptions and NonReadyUsage of client operations (getTreatments and track method calls)
   */
  start(method: Method): (label?: string) => void
}
