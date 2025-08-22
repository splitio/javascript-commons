import { IEventsCacheBase } from '../storages/types';
import { IEventsHandler, IImpressionsHandler, ITelemetryTracker } from '../trackers/types';
import { ISettings } from '../types';
import SplitIO from '../../types/splitio';

export interface IIntegration {
  queue(data: SplitIO.IntegrationData): void
}

export type IIntegrationManager = IEventsHandler & IImpressionsHandler;

export interface IIntegrationFactoryParams {
  storage: { events: IEventsCacheBase }
  settings: ISettings
  telemetryTracker: ITelemetryTracker
}

export type IntegrationFactory = SplitIO.IntegrationFactory & {
  readonly type: string
  (params: IIntegrationFactoryParams): IIntegration | void
}
