import { IIntegrationManager, IIntegrationFactoryParams } from '../integrations/types';
import { ISignalListener } from '../listeners/types';
import { ILogger } from '../logger/types';
import { IReadinessManager, ISdkReadinessManager } from '../readiness/types';
import { IFetch, ISplitApi, IEventSourceConstructor } from '../services/types';
import { IStorageAsync, IStorageSync, ISplitsCacheSync, ISplitsCacheAsync, IStorageFactoryParams } from '../storages/types';
import { ISyncManager } from '../sync/types';
import { IImpressionObserver } from '../trackers/impressionObserver/types';
import { IImpressionsTracker, IEventTracker, ITelemetryTracker, IFilterAdapter, IUniqueKeysTracker } from '../trackers/types';
import { SplitIO, ISettings, IEventEmitter } from '../types';

/**
 * Environment related dependencies.
 */
export interface IPlatform {
  /**
   * If provided, it is used to retrieve the Fetch API for HTTP requests. Otherwise, the global fetch is used.
   */
  getFetch?: () => (IFetch | undefined)
  /**
   * If provided, it is used to pass additional options to fetch calls.
   */
  getOptions?: () => object
  /**
   * If provided, it is used to retrieve the EventSource constructor for streaming support.
   */
  getEventSource?: () => (IEventSourceConstructor | undefined)
  /**
   * EventEmitter constructor, like NodeJS.EventEmitter or a polyfill.
   */
  EventEmitter: new () => IEventEmitter,
  /**
   * Function used to track latencies for telemetry.
   */
  now?: () => number
}

export interface ISdkFactoryContext {
  platform: IPlatform,
  sdkReadinessManager: ISdkReadinessManager,
  readiness: IReadinessManager,
  settings: ISettings
  impressionsTracker: IImpressionsTracker,
  eventTracker: IEventTracker,
  telemetryTracker: ITelemetryTracker,
  storage: IStorageSync | IStorageAsync,
  uniqueKeysTracker?: IUniqueKeysTracker,
  signalListener?: ISignalListener
  splitApi?: ISplitApi
  syncManager?: ISyncManager,
}

export interface ISdkFactoryContextSync extends ISdkFactoryContext {
  storage: IStorageSync,
  splitApi: ISplitApi
  syncManager: ISyncManager,
}

export interface ISdkFactoryContextAsync extends ISdkFactoryContext {
  storage: IStorageAsync,
  splitApi: undefined,
  syncManager: undefined
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
  splitApiFactory?: (settings: ISettings, platform: IPlatform, telemetryTracker: ITelemetryTracker) => ISplitApi,

  // SyncManager factory.
  // Not required when providing an asynchronous storage (consumer mode), but required in standalone mode to avoid SDK timeout.
  // It can create an offline or online sync manager, with or without streaming support.
  syncManagerFactory?: (params: ISdkFactoryContextSync) => ISyncManager,

  // Sdk manager factory
  sdkManagerFactory: (
    log: ILogger,
    splits: ISplitsCacheSync | ISplitsCacheAsync,
    sdkReadinessManager: ISdkReadinessManager
  ) => SplitIO.IManager | SplitIO.IAsyncManager,

  // Sdk client method factory (ISDK::client method).
  // It Allows to distinguish SDK clients with the client-side API (`ICsSDK`) or server-side API (`ISDK` or `IAsyncSDK`).
  sdkClientMethodFactory: (params: ISdkFactoryContext) => ({ (): SplitIO.ICsClient; (key: SplitIO.SplitKey, trafficType?: string | undefined): SplitIO.ICsClient; } | (() => SplitIO.IClient) | (() => SplitIO.IAsyncClient))

  // Impression observer factory.
  impressionsObserverFactory: () => IImpressionObserver

  filterAdapterFactory?: () => IFilterAdapter

  // Optional signal listener constructor. Used to handle special app states, like shutdown, app paused or resumed.
  // Pass only if `syncManager` (used by Node listener) and `splitApi` (used by Browser listener) are passed.
  SignalListener?: new (
    syncManager: ISyncManager | undefined, // Used by NodeSignalListener to flush data, and by BrowserSignalListener to close streaming connection.
    settings: ISettings, // Used by BrowserSignalListener
    storage: IStorageSync | IStorageAsync, // Used by BrowserSignalListener
    serviceApi: ISplitApi | undefined) => ISignalListener, // Used by BrowserSignalListener

  // @TODO review impressionListener and integrations interfaces. What about handling impressionListener as an integration ?
  integrationsManagerFactory?: (params: IIntegrationFactoryParams) => IIntegrationManager | undefined,

  // Optional function to assign additional properties to the factory instance
  extraProps?: (params: ISdkFactoryContext) => object
}
