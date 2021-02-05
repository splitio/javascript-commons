import { IEventsCacheBase } from '../storages/types';
import { IEventsHandler, IImpressionsHandler } from '../trackers/types';
import { ISettings, SplitIO } from '../types';

export interface IIntegration {
  queue(data: SplitIO.IntegrationData): void
}

export type IIntegrationManager = IEventsHandler & IImpressionsHandler;

export interface IIntegrationFactoryParams {
  storage: { events: IEventsCacheBase }
  settings: ISettings
}
