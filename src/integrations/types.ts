import { IEventsCacheBase } from '../storages/types';
import { IEventsHandler, IImpressionsHandler, ITelemetryTracker } from '../trackers/types';
import { ISettings, SplitIO } from '../types';

export interface IIntegration {
  queue(data: SplitIO.IntegrationData): void
}

export type IIntegrationManager = IEventsHandler & IImpressionsHandler;

export interface IIntegrationFactoryParams {
  storage: { events: IEventsCacheBase }
  settings: ISettings
  telemetryTracker: ITelemetryTracker
}

export type IntegrationFactory = {
  readonly type: string
  (params: IIntegrationFactoryParams): IIntegration | void
}
