import { IIntegrationManager, IIntegrationFactoryParams } from '../integrations/types';
import { ISignalListener } from '../listeners/types';
import { ILogger } from '../logger/types';
import { ISdkReadinessManager } from '../readiness/types';
import { IFetch, ISplitApi, IEventSourceConstructor } from '../services/types';
import { IStorageAsync, IStorageSync, ISplitsCacheSync, ISplitsCacheAsync, IStorageFactoryParams } from '../storages/types';
import { ISyncManager, ISyncManagerFactoryParams } from '../sync/types';
import { IImpressionObserver } from '../trackers/impressionObserver/types';
import { IImpressionsTracker, IEventTracker } from '../trackers/types';
import { SplitIO, ISettings, IEventEmitter } from '../types';

export interface ISdkFactoryContext {
  storage: IStorageSync | IStorageAsync,
  sdkReadinessManager: ISdkReadinessManager,
  settings: ISettings
  impressionsTracker: IImpressionsTracker,
  eventTracker: IEventTracker,
  signalListener?: ISignalListener
  syncManager?: ISyncManager,
}

/**
 * Environment related dependencies.
 * These getters are called a fixed number of times per factory instantiation.
 */
export interface IPlatform {
  getOptions?: () => object
  getFetch?: () => (IFetch | undefined)
  getEventSource?: () => (IEventSourceConstructor | undefined)
  EventEmitter: new () => IEventEmitter
}

/**
 * Object parameter with the modules required to create an SDK factory instance
 */
export interface ISdkFactoryParams {

  // The settings must be already validated
  settings: ISettings,

  // Platform dependencies
  platform: IPlatform,

  // Storage factory. The result storage type implies the type of the SDK:
  // sync SDK (`ISDK` or `ICsSDK`) with `IStorageSync`, and async SDK (`IAsyncSDK`) with `IStorageAsync`
  storageFactory: (params: IStorageFactoryParams) => IStorageSync | IStorageAsync,

  // Factory of Split Api (HTTP Client Service).
  // It is not required when providing an asynchronous storage or offline SyncManager
  splitApiFactory?: (settings: ISettings, platform: IPlatform) => ISplitApi,

  // SyncManager factory.
  // Not required when providing an asynchronous storage (consumer mode), but required in standalone mode to avoid SDK timeout.
  // It can create an offline or online sync manager, with or without streaming support.
  syncManagerFactory?: (params: ISyncManagerFactoryParams) => ISyncManager,

  // Sdk manager factory
  sdkManagerFactory: (
    log: ILogger,
    splits: ISplitsCacheSync | ISplitsCacheAsync,
    sdkReadinessManager: ISdkReadinessManager
  ) => SplitIO.IManager | SplitIO.IAsyncManager,

  // Sdk client method factory (ISDK::client method).
  // It Allows to distinguish SDK clients with the client-side API (`ICsSDK`) or server-side API (`ISDK` or `IAsyncSDK`).
  sdkClientMethodFactory: (params: ISdkFactoryContext) => ({ (): SplitIO.ICsClient; (key: SplitIO.SplitKey, trafficType?: string | undefined): SplitIO.ICsClient; } | (() => SplitIO.IClient) | (() => SplitIO.IAsyncClient))

  // Optional signal listener constructor. Used to handle special app states, like shutdown, app paused or resumed.
  // Pass only if `syncManager` (used by Node listener) and `splitApi` (used by Browser listener) are passed.
  SignalListener?: new (
    syncManager: ISyncManager | undefined, // Used by NodeSignalListener to flush data, and by BrowserSignalListener to close streaming connection.
    settings: ISettings, // Used by BrowserSignalListener
    storage: IStorageSync | IStorageAsync, // Used by BrowserSignalListener
    serviceApi: ISplitApi | undefined) => ISignalListener, // Used by BrowserSignalListener

  // @TODO review impressionListener and integrations interfaces. What about handling impressionListener as an integration ?
  integrationsManagerFactory?: (params: IIntegrationFactoryParams) => IIntegrationManager | undefined,

  // Impression observer factory. If provided, will be used for impressions dedupe
  impressionsObserverFactory?: () => IImpressionObserver

  // Optional function to assign additional properties to the factory instance
  extraProps?: (params: ISdkFactoryContext) => object
}
