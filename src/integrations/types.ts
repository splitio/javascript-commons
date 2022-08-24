import { IEventsCacheBase } from '../storages/types';
import { IEventsHandler, IImpressionsHandler } from '../trackers/types';
import { ISettings, IntegrationData } from '../types';

export interface IIntegration {
  queue(data: IntegrationData): void
}

export type IIntegrationManager = IEventsHandler & IImpressionsHandler;

export interface IIntegrationFactoryParams {
  storage: { events: IEventsCacheBase }
  settings: ISettings
}

export type IntegrationFactory = {
  readonly type: string
  (params: IIntegrationFactoryParams): IIntegration | void
}
