import { SplitIO, ImpressionDTO } from '../types';
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
