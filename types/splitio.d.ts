// Type definitions for Split Software SDKs
// Project: https://www.split.io/

import { RedisOptions } from 'ioredis';
import { RequestOptions } from 'http';

export as namespace SplitIO;
export = SplitIO;

/**
 * Common settings properties.
 */
interface ISharedSettings {
  /**
   * The impression listener, which is optional. Whatever you provide here needs to comply with the SplitIO.IImpressionListener interface,
   * which will check for the logImpression method.
   *
   * @defaultValue `undefined`
   */
  impressionListener?: SplitIO.IImpressionListener;
  /**
   * SDK synchronization settings.
   */
  sync?: {
    /**
     * List of feature flag filters. These filters are used to fetch a subset of the feature flag definitions in your environment, in order to reduce the delay of the SDK to be ready.
     *
     * NOTES:
     * - This configuration is only meaningful when the SDK is working in `"standalone"` mode.
     * - If `bySet` filter is provided, `byName` and `byPrefix` filters are ignored.
     * - If both `byName` and `byPrefix` filters are provided, the intersection of the two groups of feature flags is fetched.
     *
     * Example:
     * ```
     *   splitFilter: [
     *     { type: 'byName', values: ['my_feature_flag_1', 'my_feature_flag_2'] }, // will fetch feature flags named 'my_feature_flag_1' and 'my_feature_flag_2'
     *   ]
     * ```
     */
    splitFilters?: SplitIO.SplitFilter[];
    /**
     * Impressions Collection Mode. Option to determine how impressions are going to be sent to Split servers.
     * Possible values are 'DEBUG', 'OPTIMIZED', and 'NONE'.
     * - DEBUG: will send all the impressions generated (recommended only for debugging purposes).
     * - OPTIMIZED: will send unique impressions to Split servers, avoiding a considerable amount of traffic that duplicated impressions could generate.
     * - NONE: will send unique keys evaluated per feature to Split servers instead of full blown impressions, avoiding a considerable amount of traffic that impressions could generate.
     *
     * @defaultValue `'OPTIMIZED'`
     */
    impressionsMode?: SplitIO.ImpressionsMode;
    /**
     * Custom options object for HTTP(S) requests.
     * If provided, this object is merged with the options object passed by the SDK for EventSource and Fetch calls.
     * This configuration has no effect in "consumer" mode, as no HTTP(S) requests are made by the SDK.
     */
    requestOptions?: {
      /**
       * Custom function called before each request, allowing you to add or update headers in SDK HTTP requests.
       * Some headers, such as `SplitSDKVersion`, are required by the SDK and cannot be overridden.
       * To pass multiple headers with the same name, combine their values into a single line, separated by commas. Example: `{ 'Authorization': 'value1, value2' }`
       * Or provide keys with different cases since headers are case-insensitive. Example: `{ 'authorization': 'value1', 'Authorization': 'value2' }`
       *
       * NOTE: to pass custom headers to the streaming connection in Browser, you should polyfill the `window.EventSource` object with a library that supports headers,
       * like https://www.npmjs.com/package/event-source-polyfill, since native EventSource does not support them and they will be ignored.
       *
       * @defaultValue `undefined`
       *
       * @param context - The context for the request, which contains the `headers` property object representing the current headers in the request.
       * @returns An object representing a set of headers to be merged with the current headers.
       *
       * @example
       * ```
       * const factory = SplitFactory({
       *   ...
       *   sync: {
       *     getHeaderOverrides: (context) => {
       *       return {
       *         'Authorization': context.headers['Authorization'] + ', other-value',
       *         'custom-header': 'custom-value'
       *       };
       *     }
       *   }
       * });
       * ```
       */
      getHeaderOverrides?: (context: { headers: Record<string, string> }) => Record<string, string>;
    };
  };
  /**
   * List of URLs that the SDK will use as base for it's synchronization functionalities, applicable only when running as standalone and partial consumer modes.
   * Do not change these settings unless you're working an advanced use case, like connecting to the Split proxy.
   */
  urls?: SplitIO.UrlSettings;
}
/**
 * Common settings properties for SDKs with synchronous API (standalone and localhost modes).
 */
interface ISyncSharedSettings extends ISharedSettings {
  /**
   * The SDK mode. When using the default in-memory storage or `InLocalStorage` as storage, the only possible value is "standalone", which is the default.
   * For "localhost" mode, use "localhost" as authorizationKey.
   *
   * @defaultValue `'standalone'`
   */
  mode?: 'standalone';
  /**
   * Boolean flag to enable the streaming service as default synchronization mechanism. In the event of any issue with streaming,
   * the SDK would fallback to the polling mechanism. If false, the SDK would poll for changes as usual without attempting to use streaming.
   *
   * @defaultValue `true`
   */
  streamingEnabled?: boolean;
  /**
   * SDK synchronization settings.
   */
  sync?: ISharedSettings['sync'] & {
    /**
     * Controls the SDK continuous synchronization flags.
     *
     * When `true` a running SDK will process rollout plan updates performed on the UI (default).
     * When false it'll just fetch all data upon init.
     *
     * @defaultValue `true`
     */
    enabled?: boolean;
  };
}
/**
 * Common settings properties for SDKs with pluggable options.
 */
interface IPluggableSharedSettings {
  /**
   * Boolean value to indicate whether the logger should be enabled or disabled by default, or a log level string or a Logger object.
   * Passing a logger object is required to get descriptive log messages. Otherwise most logs will print with message codes.
   * @see {@link https://help.split.io/hc/en-us/articles/360058730852-Browser-SDK#logging}.
   *
   * Examples:
   * ```
   * config.debug = true
   * config.debug = 'WARN'
   * config.debug = ErrorLogger()
   * ```
   *
   * @defaultValue `false`
   */
  debug?: boolean | SplitIO.LogLevel | SplitIO.ILogger;
  /**
   * Defines an optional list of factory functions used to instantiate SDK integrations.
   *
   * NOTE: at the moment there are not integrations to plug in.
   */
  integrations?: SplitIO.IntegrationFactory[];
}
/**
 * Common settings properties for SDKs without pluggable options.
 */
interface INonPluggableSharedSettings {
  /**
   * Boolean value to indicate whether the logger should be enabled or disabled, or a log level string.
   *
   * Examples:
   * ```
   * config.debug = true
   * config.debug = 'WARN'
   * ```
   *
   * @defaultValue `false`
   */
  debug?: boolean | SplitIO.LogLevel;
}
/**
 * Common settings properties for SDKs with server-side API.
 */
interface IServerSideSharedSettings {
  /**
   * SDK Core settings for Node.js.
   */
  core: {
    /**
     * Your SDK key.
     *
     * @see {@link https://help.split.io/hc/en-us/articles/360019916211-API-keys}
     */
    authorizationKey: string;
    /**
     * Disable labels from being sent to Split backend. Labels may contain sensitive information.
     *
     * @defaultValue `true`
     */
    labelsEnabled?: boolean;
    /**
     * Disable machine IP and Name from being sent to Split backend.
     *
     * @defaultValue `true`
     */
    IPAddressesEnabled?: boolean;
  };
  /**
   * SDK Startup settings for Node.js.
   */
  startup?: {
    /**
     * Maximum amount of time used before notify a timeout.
     *
     * @defaultValue `15`
     */
    readyTimeout?: number;
    /**
     * Time to wait for a request before the SDK is ready. If this time expires, JS SDK will retry 'retriesOnFailureBeforeReady' times before notifying its failure to be 'ready'.
     *
     * @defaultValue `15`
     */
    requestTimeoutBeforeReady?: number;
    /**
     * How many quick retries we will do while starting up the SDK.
     *
     * @defaultValue `1`
     */
    retriesOnFailureBeforeReady?: number;
    /**
     * For SDK posts the queued events data in bulks with a given rate, but the first push window is defined separately,
     * to better control on browsers. This number defines that window before the first events push.
     *
     * @defaultValue `0`
     */
    eventsFirstPushWindow?: number;
  };
  /**
   * SDK scheduler settings.
   */
  scheduler?: {
    /**
     * The SDK polls Split servers for changes to feature flag definitions. This parameter controls this polling period in seconds.
     *
     * @defaultValue `60`
     */
    featuresRefreshRate?: number;
    /**
     * The SDK sends information on who got what treatment at what time back to Split servers to power analytics. This parameter controls how often this data is sent to Split servers. The parameter should be in seconds.
     *
     * @defaultValue `300`
     */
    impressionsRefreshRate?: number;
    /**
     * The maximum number of impression items we want to queue. If we queue more values, it will trigger a flush and reset the timer.
     * If you use a 0 here, the queue will have no maximum size.
     *
     * @defaultValue `30000`
     */
    impressionsQueueSize?: number;
    /**
     * The SDK sends diagnostic metrics to Split servers. This parameters controls this metric flush period in seconds.
     *
     * @defaultValue `120`
     * @deprecated This parameter is ignored now. Use `telemetryRefreshRate` instead.
     */
    metricsRefreshRate?: number;
    /**
     * The SDK sends diagnostic metrics to Split servers. This parameters controls this metric flush period in seconds.
     *
     * @defaultValue `3600`
     */
    telemetryRefreshRate?: number;
    /**
     * The SDK polls Split servers for changes to segment definitions. This parameter controls this polling period in seconds.
     *
     * @defaultValue `60`
     */
    segmentsRefreshRate?: number;
    /**
     * The SDK posts the queued events data in bulks. This parameter controls the posting rate in seconds.
     *
     * @defaultValue `60`
     */
    eventsPushRate?: number;
    /**
     * The maximum number of event items we want to queue. If we queue more values, it will trigger a flush and reset the timer.
     * If you use a 0 here, the queue will have no maximum size.
     *
     * @defaultValue `500`
     */
    eventsQueueSize?: number;
    /**
     * For mocking/testing only. The SDK will refresh the features mocked data when mode is set to "localhost" by defining the key.
     * For more information see {@link https://help.split.io/hc/en-us/articles/360020564931-Node-js-SDK#localhost-mode}
     *
     * @defaultValue `15`
     */
    offlineRefreshRate?: number;
    /**
     * When using streaming mode, seconds to wait before re attempting to connect for push notifications.
     * Next attempts follow intervals in power of two: base seconds, base x 2 seconds, base x 4 seconds, ...
     *
     * @defaultValue `1`
     */
    pushRetryBackoffBase?: number;
  };
  /**
   * Mocked features file path. For testing purposes only. For using this you should specify "localhost" as authorizationKey on core settings.
   * @see {@link https://help.split.io/hc/en-us/articles/360020564931-Node-js-SDK#localhost-mode}
   *
   * @defaultValue `'$HOME/.split'`
   */
  features?: SplitIO.MockedFeaturesFilePath;
}
/**
 * Common settings properties for SDKs with client-side API.
 */
interface IClientSideSharedSettings {
  /**
   * SDK Core settings for client-side.
   */
  core: {
    /**
     * Your SDK key.
     *
     * @see {@link https://help.split.io/hc/en-us/articles/360019916211-API-keys}
     */
    authorizationKey: string;
    /**
     * Customer identifier. Whatever this means to you.
     *
     * @see {@link https://help.split.io/hc/en-us/articles/360019916311-Traffic-type}
     */
    key: SplitIO.SplitKey;
    /**
     * Disable labels from being sent to Split backend. Labels may contain sensitive information.
     *
     * @defaultValue `true`
     */
    labelsEnabled?: boolean;
  };
  /**
   * User consent status. Possible values are `'GRANTED'`, which is the default, `'DECLINED'` or `'UNKNOWN'`.
   * - `'GRANTED'`: the user grants consent for tracking events and impressions. The SDK sends them to Split cloud.
   * - `'DECLINED'`: the user declines consent for tracking events and impressions. The SDK does not send them to Split cloud.
   * - `'UNKNOWN'`: the user neither grants nor declines consent for tracking events and impressions. The SDK tracks them in its internal storage, and eventually either sends
   * them or not if the consent status is updated to 'GRANTED' or 'DECLINED' respectively. The status can be updated at any time with the `UserConsent.setStatus` factory method.
   *
   * @defaultValue `'GRANTED'`
   */
  userConsent?: SplitIO.ConsentStatus;
}
/**
 * Common settings properties for SDKs with client-side and synchronous API (standalone and localhost modes).
 */
interface IClientSideSyncSharedSettings extends IClientSideSharedSettings, ISyncSharedSettings {
  /**
   * Mocked features map. For testing purposes only. For using this you should specify "localhost" as authorizationKey on core settings.
   * @see {@link https://help.split.io/hc/en-us/articles/360020448791-JavaScript-SDK#localhost-mode}
   */
  features?: SplitIO.MockedFeaturesMap;
  /**
   * SDK Startup settings.
   */
  startup?: {
    /**
     * Maximum amount of time used before notify a timeout.
     *
     * @defaultValue `10`
     */
    readyTimeout?: number;
    /**
     * Time to wait for a request before the SDK is ready. If this time expires, JS SDK will retry 'retriesOnFailureBeforeReady' times before notifying its failure to be 'ready'.
     *
     * @defaultValue `5`
     */
    requestTimeoutBeforeReady?: number;
    /**
     * How many quick retries we will do while starting up the SDK.
     *
     * @defaultValue `1`
     */
    retriesOnFailureBeforeReady?: number;
    /**
     * For SDK posts the queued events data in bulks with a given rate, but the first push window is defined separately,
     * to better control on browsers or mobile. This number defines that window before the first events push.
     *
     * @defaultValue `10`
     */
    eventsFirstPushWindow?: number;
  };
  /**
   * SDK scheduler settings.
   */
  scheduler?: {
    /**
     * The SDK polls Split servers for changes to feature flag definitions. This parameter controls this polling period in seconds.
     *
     * @defaultValue `60`
     */
    featuresRefreshRate?: number;
    /**
     * The SDK sends information on who got what treatment at what time back to Split servers to power analytics. This parameter controls how often this data is sent to Split servers. The parameter should be in seconds.
     *
     * @defaultValue `60`
     */
    impressionsRefreshRate?: number;
    /**
     * The maximum number of impression items we want to queue. If we queue more values, it will trigger a flush and reset the timer.
     * If you use a 0 here, the queue will have no maximum size.
     *
     * @defaultValue `30000`
     */
    impressionsQueueSize?: number;
    /**
     * The SDK sends diagnostic metrics to Split servers. This parameters controls this metric flush period in seconds.
     *
     * @defaultValue `120`
     * @deprecated This parameter is ignored now. Use `telemetryRefreshRate` instead.
     */
    metricsRefreshRate?: number;
    /**
     * The SDK sends diagnostic metrics to Split servers. This parameters controls this metric flush period in seconds.
     *
     * @defaultValue `3600`
     */
    telemetryRefreshRate?: number;
    /**
     * The SDK polls Split servers for changes to segment definitions. This parameter controls this polling period in seconds.
     *
     * @defaultValue `60`
     */
    segmentsRefreshRate?: number;
    /**
     * The SDK posts the queued events data in bulks. This parameter controls the posting rate in seconds.
     *
     * @defaultValue `60`
     */
    eventsPushRate?: number;
    /**
     * The maximum number of event items we want to queue. If we queue more values, it will trigger a flush and reset the timer.
     * If you use a 0 here, the queue will have no maximum size.
     *
     * @defaultValue `500`
     */
    eventsQueueSize?: number;
    /**
     * For mocking/testing only. The SDK will refresh the features mocked data when mode is set to "localhost" by defining the key.
     * For more information see {@link https://help.split.io/hc/en-us/articles/360020448791-JavaScript-SDK#localhost-mode}
     *
     * @defaultValue `15`
     */
    offlineRefreshRate?: number;
    /**
     * When using streaming mode, seconds to wait before re attempting to connect for push notifications.
     * Next attempts follow intervals in power of two: base seconds, base x 2 seconds, base x 4 seconds, ...
     *
     * @defaultValue `1`
     */
    pushRetryBackoffBase?: number;
  };
}

/****** Exposed namespace ******/
/**
 * Shared types and interfaces for `@splitsoftware` packages, to support integrating JavaScript SDKs with TypeScript.
 */
declare namespace SplitIO {

  interface StorageWrapper {
    /**
     * Returns a promise that resolves to the current value associated with the given key, or null if the given key does not exist.
     */
    getItem(key: string): Promise<string | null> | string | null;
    /**
     * Returns a promise that resolves when the value of the pair identified by key is set to value, creating a new key/value pair if none existed for key previously.
     */
    setItem(key: string, value: string): Promise<void> | void;
    /**
     * Returns a promise that resolves when the key/value pair with the given key is removed, if a key/value pair with the given key exists.
     */
    removeItem(key: string): Promise<void> | void;
  }

  /**
   * EventEmitter interface based on a subset of the Node.js EventEmitter methods.
   */
  interface IEventEmitter {
    addListener(event: string, listener: (...args: any[]) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    removeListener(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string): this;
    emit(event: string, ...args: any[]): boolean;
  }
  /**
   * Node.js EventEmitter interface
   * @see {@link https://nodejs.org/api/events.html}
   */
  interface EventEmitter extends IEventEmitter {
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
    off(event: string | symbol, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string | symbol): this;
    emit(event: string | symbol, ...args: any[]): boolean;
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
    listeners(event: string | symbol): Function[];
    rawListeners(event: string | symbol): Function[];
    listenerCount(type: string | symbol): number;
    // Added in Node.js 6...
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
    eventNames(): Array<string | symbol>;
  }
  /**
   * Event constants.
   */
  type EventConsts = {
    /**
     * The ready event.
     */
    SDK_READY: 'init::ready';
    /**
     * The ready event when fired with cached data.
     */
    SDK_READY_FROM_CACHE: 'init::cache-ready';
    /**
     * The timeout event.
     */
    SDK_READY_TIMED_OUT: 'init::timeout';
    /**
     * The update event.
     */
    SDK_UPDATE: 'state::update';
  };
  /**
   * SDK Modes.
   */
  type SDKMode = 'standalone' | 'localhost' | 'consumer' | 'consumer_partial';
  /**
   * Storage types.
   */
  type StorageType = 'MEMORY' | 'LOCALSTORAGE' | 'REDIS' | 'PLUGGABLE';
  /**
   * Settings interface. This is a representation of the settings the SDK expose, that's why
   * most of it's props are readonly. Only features should be rewritten when localhost mode is active.
   */
  interface ISettings {
    readonly core: {
      authorizationKey: string;
      key: SplitKey;
      labelsEnabled: boolean;
      IPAddressesEnabled: boolean;
    };
    readonly mode: SDKMode;
    readonly scheduler: {
      featuresRefreshRate: number;
      impressionsRefreshRate: number;
      impressionsQueueSize: number;
      /**
       * @deprecated Use `telemetryRefreshRate` instead.
       */
      metricsRefreshRate?: number;
      telemetryRefreshRate: number;
      segmentsRefreshRate: number;
      offlineRefreshRate: number;
      eventsPushRate: number;
      eventsQueueSize: number;
      pushRetryBackoffBase: number;
    };
    readonly startup: {
      readyTimeout: number;
      requestTimeoutBeforeReady: number;
      retriesOnFailureBeforeReady: number;
      eventsFirstPushWindow: number;
    };
    readonly storage: StorageSyncFactory | StorageAsyncFactory | StorageOptions;
    readonly urls: {
      events: string;
      sdk: string;
      auth: string;
      streaming: string;
      telemetry: string;
    };
    readonly integrations?: IntegrationFactory[];
    readonly debug: boolean | LogLevel | ILogger;
    readonly version: string;
    /**
     * Mocked features map if using in client-side, or mocked features file path string if using in server-side (Node.js).
     */
    features: MockedFeaturesMap | MockedFeaturesFilePath;
    readonly streamingEnabled: boolean;
    readonly sync: {
      splitFilters: SplitFilter[];
      impressionsMode: ImpressionsMode;
      enabled: boolean;
      flagSpecVersion: string;
      requestOptions?: {
        getHeaderOverrides?: (context: { headers: Record<string, string> }) => Record<string, string>;
      };
    };
    readonly runtime: {
      ip: string | false;
      hostname: string | false;
    };
    readonly impressionListener?: IImpressionListener;
    /**
     * User consent status if using in client-side. Undefined if using in server-side (Node.js).
     */
    readonly userConsent?: ConsentStatus;
  }
  /**
   * Log levels.
   */
  type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'NONE';
  /**
   * Logger API
   */
  interface ILoggerAPI {
    /**
     * Enables SDK logging to the console.
     */
    enable(): void;
    /**
     * Disables SDK logging.
     */
    disable(): void;
    /**
     * Sets a log level for the SDK logs.
     */
    setLogLevel(logLevel: LogLevel): void;
    /**
     * Log level constants. Use this to pass them to setLogLevel function.
     */
    LogLevel: {
      [level in LogLevel]: LogLevel;
    };
  }
  /**
   * User consent API
   */
  interface IUserConsentAPI {
    /**
     * Sets or updates the user consent status. Possible values are `true` and `false`, which represent user consent `'GRANTED'` and `'DECLINED'` respectively.
     * - `true ('GRANTED')`: the user has granted consent for tracking events and impressions. The SDK will send them to Split cloud.
     * - `false ('DECLINED')`: the user has declined consent for tracking events and impressions. The SDK will not send them to Split cloud.
     *
     * NOTE: calling this method updates the user consent at a factory level, affecting all clients of the same factory.
     *
     * @param userConsent - The user consent status, true for 'GRANTED' and false for 'DECLINED'.
     * @returns Whether the provided param is a valid value (i.e., a boolean value) or not.
     */
    setStatus(userConsent: boolean): boolean;
    /**
     * Gets the user consent status.
     *
     * @returns The user consent status.
     */
    getStatus(): ConsentStatus;
    /**
     * Consent status constants. Use this to compare with the getStatus function result.
     */
    Status: {
      [status in ConsentStatus]: ConsentStatus;
    };
  }
  /**
   * Common API for entities that expose status handlers.
   */
  interface IStatusInterface extends EventEmitter {
    /**
     * Constant object containing the SDK events for you to use.
     */
    Event: EventConsts;
    /**
     * Returns a promise that resolves once the SDK has finished loading (`SDK_READY` event emitted) or rejected if the SDK has timedout (`SDK_READY_TIMED_OUT` event emitted).
     * As it's meant to provide similar flexibility to the event approach, given that the SDK might be eventually ready after a timeout event, the `ready` method will return a resolved promise once the SDK is ready.
     *
     * Caveats: the method was designed to avoid an unhandled Promise rejection if the rejection case is not handled, so that `onRejected` handler is optional when using promises.
     * However, when using async/await syntax, the rejection should be explicitly propagated like in the following example:
     * ```
     * try {
     *   await client.ready().catch((e) => { throw e; });
     *   // SDK is ready
     * } catch(e) {
     *   // SDK has timedout
     * }
     * ```
     *
     * @returns A promise that resolves once the SDK is ready or rejects if the SDK has timedout.
     */
    ready(): Promise<void>;
  }
  /**
   * Common definitions between clients for different environments interface.
   */
  interface IBasicClient extends IStatusInterface {
    /**
     * Destroys the client instance.
     *
     * In 'standalone' and 'partial consumer' modes, this method will flush any pending impressions and events.
     * In 'standalone' mode, it also stops the synchronization of feature flag definitions with the backend.
     * In 'consumer' and 'partial consumer' modes, this method also disconnects the SDK from the Pluggable storage.
     *
     * @returns A promise that resolves once the client is destroyed.
     */
    destroy(): Promise<void>;
  }
  /**
   * Common definitions between SDK instances for different environments interface.
   */
  interface IBasicSDK {
    /**
     * Current settings of the SDK instance.
     */
    settings: ISettings;
    /**
     * Logger API.
     */
    Logger: ILoggerAPI;
    /**
     * Destroys all the clients created by this factory.
     *
     * @returns A promise that resolves once all clients are destroyed.
     */
    destroy(): Promise<void>;
  }
  /**
   * Feature flag treatment value, returned by getTreatment.
   */
  type Treatment = string;
  /**
   * Feature flag treatment promise that resolves to actual treatment value.
   */
  type AsyncTreatment = Promise<Treatment>;
  /**
   * An object with the treatments for a bulk of feature flags, returned by getTreatments. For example:
   * ```
   *   {
   *     feature1: 'on',
   *     feature2: 'off'
   *   }
   * ```
   */
  type Treatments = {
    [featureName: string]: Treatment;
  };
  /**
   * Feature flag treatments promise that resolves to the actual SplitIO.Treatments object.
   */
  type AsyncTreatments = Promise<Treatments>;
  /**
   * Feature flag evaluation result with treatment and configuration, returned by getTreatmentWithConfig.
   */
  type TreatmentWithConfig = {
    /**
     * The treatment string.
     */
    treatment: string;
    /**
     * The stringified version of the JSON config defined for that treatment, null if there is no config for the resulting treatment.
     */
    config: string | null;
  };
  /**
   * Feature flag treatment promise that resolves to actual SplitIO.TreatmentWithConfig object.
   */
  type AsyncTreatmentWithConfig = Promise<TreatmentWithConfig>;
  /**
   * An object with the treatments with configs for a bulk of feature flags, returned by getTreatmentsWithConfig.
   * Each existing configuration is a stringified version of the JSON you defined on the Split user interface. For example:
   * ```
   *   {
   *     feature1: { treatment: 'on', config: null }
   *     feature2: { treatment: 'off', config: '{"bannerText":"Click here."}' }
   *   }
   * ```
   */
  type TreatmentsWithConfig = {
    [featureName: string]: TreatmentWithConfig;
  };
  /**
   * Feature flag treatments promise that resolves to the actual SplitIO.TreatmentsWithConfig object.
   */
  type AsyncTreatmentsWithConfig = Promise<TreatmentsWithConfig>;
  /**
   * Possible Split SDK events.
   */
  type Event = 'init::timeout' | 'init::ready' | 'init::cache-ready' | 'state::update';
  /**
   * Attributes should be on object with values of type string, boolean, number (dates should be sent as millis since epoch) or array of strings or numbers.
   *
   * @see {@link https://help.split.io/hc/en-us/articles/360020448791-JavaScript-SDK#attribute-syntax}
   */
  type Attributes = {
    [attributeName: string]: AttributeType;
  };
  /**
   * Type of an attribute value
   */
  type AttributeType = string | number | boolean | Array<string | number>;
  /**
   * Properties should be an object with values of type string, number, boolean or null. Size limit of ~31kb.
   *
   * @see {@link https://help.split.io/hc/en-us/articles/360020448791-JavaScript-SDK#track}
   */
  type Properties = {
    [propertyName: string]: string | number | boolean | null;
  };
  /**
   * Evaluation options object for getTreatment methods.
   */
  type EvaluationOptions = {
    /**
     * Optional properties to append to the generated impression object sent to Split backend.
     */
    properties?: Properties;
  }
  /**
   * The SplitKey object format.
   */
  type SplitKeyObject = {
    matchingKey: string;
    bucketingKey: string;
  };
  /**
   * The customer identifier. Could be a SplitKeyObject or a string.
   */
  type SplitKey = SplitKeyObject | string;
  /**
   * Path to file with mocked features (for node).
   */
  type MockedFeaturesFilePath = string;
  /**
   * Object with mocked features mapping for client-side (e.g., Browser or React Native). We need to specify the featureName as key, and the mocked treatment as value.
   */
  type MockedFeaturesMap = {
    [featureName: string]: string | TreatmentWithConfig;
  };
  /**
   * Impression DTO generated by the SDK when processing evaluations.
   */
  type ImpressionDTO = {
    /**
     * Feature flag name.
     */
    feature: string;
    /**
     * Key.
     */
    keyName: string;
    /**
     * Treatment value.
     */
    treatment: string;
    /**
     * Impression timestamp.
     */
    time: number;
    /**
     * Bucketing Key
     */
    bucketingKey?: string;
    /**
     * Rule label
     */
    label: string;
    /**
     * Version of the feature flag
     */
    changeNumber: number;
    /**
     * Previous time
     */
    pt?: number;
    /**
     * JSON stringified version of the impression properties.
     */
    properties?: string;
  }
  /**
   * Object with information about an impression. It contains the generated impression DTO as well as
   * complementary information around where and how it was generated in that way.
   */
  type ImpressionData = {
    impression: ImpressionDTO;
    attributes?: Attributes;
    ip: string | false;
    hostname: string | false;
    sdkLanguageVersion: string;
  };
  /**
   * Data corresponding to one feature flag view.
   */
  type SplitView = {
    /**
     * The name of the feature flag.
     */
    name: string;
    /**
     * The traffic type of the feature flag.
     */
    trafficType: string;
    /**
     * Whether the feature flag is killed or not.
     */
    killed: boolean;
    /**
     * The list of treatments available for the feature flag.
     */
    treatments: string[];
    /**
     * Current change number of the feature flag.
     */
    changeNumber: number;
    /**
     * Map of configurations per treatment.
     * Each existing configuration is a stringified version of the JSON you defined on the Split user interface.
     */
    configs: {
      [treatmentName: string]: string;
    };
    /**
     * List of sets of the feature flag.
     */
    sets: string[];
    /**
     * The default treatment of the feature flag.
     */
    defaultTreatment: string;
    /**
     * Whether the feature flag has impressions tracking disabled or not.
     */
    impressionsDisabled: boolean;
    /**
     * Prerequisites for the feature flag.
     */
    prerequisites: Array<{ flagName: string, treatments: string[] }>;
  };
  /**
   * A promise that resolves to a feature flag view or null if the feature flag is not found.
   */
  type SplitViewAsync = Promise<SplitView | null>;
  /**
   * An array containing the SplitIO.SplitView elements.
   */
  type SplitViews = Array<SplitView>;
  /**
   * A promise that resolves to an SplitIO.SplitViews array.
   */
  type SplitViewsAsync = Promise<SplitViews>;
  /**
   * An array of feature flag names.
   */
  type SplitNames = Array<string>;
  /**
   * A promise that resolves to an array of feature flag names.
   */
  type SplitNamesAsync = Promise<SplitNames>;
  /**
   * Storage for synchronous (standalone) SDK.
   * Its interface details are not part of the public API.
   */
  type StorageSync = any;
  /**
   * Storage builder for synchronous (standalone) SDK.
   * Input parameter details are not part of the public API.
   */
  type StorageSyncFactory = {
    readonly type: StorageType;
    (params: any): (StorageSync | undefined);
  }
  /**
   * Configuration params for `InLocalStorage`
   */
  type InLocalStorageOptions = {
    /**
     * Optional prefix to prevent any kind of data collision when having multiple factories using the same storage type.
     *
     * @defaultValue `'SPLITIO'`
     */
    prefix?: string;
    /**
     * Number of days before cached data expires if it was not successfully synchronized (i.e., last SDK_READY or SDK_UPDATE event emitted). If cache expires, it is cleared on initialization.
     *
     * @defaultValue `10`
     */
    expirationDays?: number;
    /**
     * Optional settings to clear the cache. If set to `true`, the SDK clears the cached data on initialization, unless the cache was cleared within the last 24 hours.
     *
     * @defaultValue `false`
     */
    clearOnInit?: boolean;
    /**
     * Optional storage wrapper to persist rollout plan related data. If not provided, the SDK will use the default localStorage Web API.
     *
     * @defaultValue `window.localStorage`
     */
    wrapper?: StorageWrapper;
  }
  /**
   * Storage for asynchronous (consumer) SDK.
   * Its interface details are not part of the public API.
   */
  type StorageAsync = any
  /**
   * Storage builder for asynchronous (consumer) SDK.
   * Input parameter details are not part of the public API.
   */
  type StorageAsyncFactory = {
    readonly type: StorageType;
    (params: any): StorageAsync;
  }
  /**
   * Configuration params for `PluggableStorage`
   */
  type PluggableStorageOptions = {
    /**
     * Optional prefix to prevent any kind of data collision when having multiple factories using the same storage wrapper.
     *
     * @defaultValue `'SPLITIO'`
     */
    prefix?: string;
    /**
     * Storage wrapper.
     */
    wrapper: Object;
  }
  /**
   * Synchronous storage valid types for Node.js.
   */
  type NodeSyncStorage = 'MEMORY';
  /**
   * Asynchronous storages valid types for Node.js.
   */
  type NodeAsyncStorage = 'REDIS';
  /**
   * Storage valid types for the browser.
   */
  type BrowserStorage = 'MEMORY' | 'LOCALSTORAGE';
  /**
   * Storage options for the SDK with no pluggable storage.
   */
  type StorageOptions = {
    type: NodeSyncStorage | NodeAsyncStorage | BrowserStorage;
    prefix?: string;
    options?: Object;
  }
  /**
   * Impression listener interface. This is the interface that needs to be implemented
   * by the element you provide to the SDK as impression listener.
   *
   * @see {@link https://help.split.io/hc/en-us/articles/360020564931-Node-js-SDK#listener}
   */
  interface IImpressionListener {
    logImpression(data: ImpressionData): void;
  }
  /**
   * SDK integration instance.
   * Its interface details are not part of the public API.
   */
  type Integration = any;
  /**
   * SDK integration factory.
   * By returning an integration, the SDK will queue events and impressions into it.
   * Input parameter details are not part of the public API.
   */
  type IntegrationFactory = {
    readonly type: string;
    (params: any): (Integration | void);
  }
  /**
   * A pair of user key and it's trafficType, required for tracking valid Split events.
   */
  type Identity = {
    /**
     * The user key.
     */
    key: string;
    /**
     * The key traffic type.
     */
    trafficType: string;
  };
  /**
   * Object with information about a Split event.
   */
  type EventData = {
    eventTypeId: string;
    value?: number;
    properties?: Properties;
    trafficTypeName?: string;
    key?: string;
    timestamp: number;
  };
  /**
   * Object representing the data sent by Split (events and impressions).
   */
  type IntegrationData = {
    /**
     * The type of Split data.
     */
    type: 'IMPRESSION';
    /**
     * The impression data.
     */
    payload: ImpressionData;
  } | {
    /**
     * The type of Split data.
     */
    type: 'EVENT';
    /**
     * The event data.
     */
    payload: EventData;
  };
  /**
   * Available URL settings for the SDKs.
   */
  type UrlSettings = {
    /**
     * String property to override the base URL where the SDK will get rollout plan related data, like feature flags and segments definitions.
     *
     * @defaultValue `'https://sdk.split.io/api'`
     */
    sdk?: string;
    /**
     * String property to override the base URL where the SDK will post event-related information like impressions.
     *
     * @defaultValue `'https://events.split.io/api'`
     */
    events?: string;
    /**
     * String property to override the base URL where the SDK will get authorization tokens to be used with functionality that requires it, like streaming.
     *
     * @defaultValue `'https://auth.split.io/api'`
     */
    auth?: string;
    /**
     * String property to override the base URL where the SDK will connect to receive streaming updates.
     *
     * @defaultValue `'https://streaming.split.io'`
     */
    streaming?: string;
    /**
     * String property to override the base URL where the SDK will post telemetry data.
     *
     * @defaultValue `'https://telemetry.split.io/api'`
     */
    telemetry?: string;
  };

  /**
   * SplitFilter type.
   */
  type SplitFilterType = 'bySet' | 'byName' | 'byPrefix';
  /**
   * Defines a feature flag filter, described by a type and list of values.
   */
  interface SplitFilter {
    /**
     * Type of the filter.
     */
    type: SplitFilterType;
    /**
     * List of values: flag set names for 'bySet' filter type, feature flag names for 'byName' filter type, and feature flag name prefixes for 'byPrefix' type.
     */
    values: string[];
  }
  /**
  * ImpressionsMode type
  */
  type ImpressionsMode = 'OPTIMIZED' | 'DEBUG' | 'NONE';
  /**
   * User consent status.
   */
  type ConsentStatus = 'GRANTED' | 'DECLINED' | 'UNKNOWN';
  /**
   * Logger. Its interface details are not part of the public API. It shouldn't be used directly.
   */
  interface ILogger {
    setLogLevel(logLevel: LogLevel): void;
  }
  /**
   * Settings interface for Browser SDK instances created with client-side API and synchronous storage (e.g., in-memory or local storage).
   *
   * @see {@link https://help.split.io/hc/en-us/articles/360058730852-Browser-SDK#configuration}
   */
  interface IClientSideSettings extends IClientSideSyncSharedSettings, IPluggableSharedSettings {
    /**
     * Defines the factory function to instantiate the storage. If not provided, the default in-memory storage is used.
     *
     * NOTE: Currently, there is no persistent storage option available for the React Native SDK; only `InLocalStorage` for the Browser SDK.
     *
     * Example:
     * ```
     * SplitFactory({
     *   ...
     *   storage: InLocalStorage()
     * })
     * ```
     */
    storage?: StorageSyncFactory;
  }
  /**
   * Settings interface for React Native SDK instances, with client-side API and synchronous storage.
   *
   * @see {@link https://help.split.io/hc/en-us/articles/4406066357901-React-Native-SDK#configuration}
   */
  interface IReactNativeSettings extends IClientSideSettings { }
  /**
   * Settings interface for Browser SDK instances created with client-side API and asynchronous storage (e.g., serverless environments with a persistent storage).
   * If your storage is synchronous (by default we use memory, which is sync) use SplitIO.IClientSideSettings instead.
   *
   * @see {@link https://help.split.io/hc/en-us/articles/360058730852-Browser-SDK#sharing-state-with-a-pluggable-storage}
   */
  interface IClientSideAsyncSettings extends IClientSideSharedSettings, ISharedSettings, IPluggableSharedSettings {
    /**
     * The SDK mode. When using `PluggableStorage` as storage, the possible values are "consumer" and "consumer_partial".
     *
     * @see {@link https://help.split.io/hc/en-us/articles/360058730852-Browser-SDK#sharing-state-with-a-pluggable-storage}
     */
    mode: 'consumer' | 'consumer_partial';
    /**
     * Defines the factory function to instantiate the storage.
     *
     * Example:
     * ```
     * SplitFactory({
     *   ...
     *   storage: PluggableStorage({ wrapper: SomeWrapper })
     * })
     * ```
     */
    storage: StorageAsyncFactory;
    /**
     * SDK Startup settings.
     */
    startup?: {
      /**
       * Maximum amount of time used before notify a timeout.
       *
       * @defaultValue `5`
       */
      readyTimeout?: number;
      /**
       * For SDK posts the queued events data in bulks with a given rate, but the first push window is defined separately,
       * to better control on browsers or mobile. This number defines that window before the first events push.
       *
       * NOTE: this param is ignored in 'consumer' mode.
       *
       * @defaultValue `10`
       */
      eventsFirstPushWindow?: number;
    };
    /**
     * SDK scheduler settings.
     */
    scheduler?: {
      /**
       * The SDK sends information on who got what treatment at what time back to Split servers to power analytics. This parameter controls how often this data is sent to Split servers. The parameter should be in seconds.
       *
       * NOTE: this param is ignored in 'consumer' mode.
       *
       * @defaultValue `60`
       */
      impressionsRefreshRate?: number;
      /**
       * The maximum number of impression items we want to queue. If we queue more values, it will trigger a flush and reset the timer.
       * If you use a 0 here, the queue will have no maximum size.
       *
       * NOTE: this param is ignored in 'consumer' mode.
       *
       * @defaultValue `30000`
       */
      impressionsQueueSize?: number;
      /**
       * The SDK sends diagnostic metrics to Split servers. This parameters controls this metric flush period in seconds.
       *
       * NOTE: this param is ignored in 'consumer' mode.
       *
       * @defaultValue `3600`
       */
      telemetryRefreshRate?: number;
      /**
       * The SDK posts the queued events data in bulks. This parameter controls the posting rate in seconds.
       *
       * NOTE: this param is ignored in 'consumer' mode.
       *
       * @defaultValue `60`
       */
      eventsPushRate?: number;
      /**
       * The maximum number of event items we want to queue. If we queue more values, it will trigger a flush and reset the timer.
       * If you use a 0 here, the queue will have no maximum size.
       *
       * NOTE: this param is ignored in 'consumer' mode.
       *
       * @defaultValue `500`
       */
      eventsQueueSize?: number;
    };
  }
  /**
   * Settings interface for JavaScript SDK instances created on the browser, with client-side API and synchronous storage (e.g., in-memory or local storage).
   *
   * @see {@link https://help.split.io/hc/en-us/articles/360020448791-JavaScript-SDK#configuration}
   */
  interface IBrowserSettings extends IClientSideSyncSharedSettings, INonPluggableSharedSettings {
    /**
     * Defines which kind of storage we can instantiate on the browser.
     * Possible storage types are 'MEMORY', which is the default, and 'LOCALSTORAGE'.
     */
    storage?: {
      /**
       * Storage type to be instantiated by the SDK.
       *
       * @defaultValue `'MEMORY'`
       */
      type?: BrowserStorage;
      /**
       * Optional prefix to prevent any kind of data collision between SDK versions when using 'LOCALSTORAGE'.
       *
       * @defaultValue `'SPLITIO'`
       */
      prefix?: string;
      /**
       * Optional settings for the 'LOCALSTORAGE' storage type. It specifies the number of days before cached data expires if it was not successfully synchronized (i.e., last SDK_READY or SDK_UPDATE event emitted). If cache expires, it is cleared on initialization.
       *
       * @defaultValue `10`
       */
      expirationDays?: number;
      /**
       * Optional settings for the 'LOCALSTORAGE' storage type. If set to `true`, the SDK clears the cached data on initialization, unless the cache was cleared within the last 24 hours.
       *
       * @defaultValue `false`
       */
      clearOnInit?: boolean;
      /**
       * Optional storage wrapper to persist rollout plan related data. If not provided, the SDK will use the default localStorage Web API.
       *
       * @defaultValue `window.localStorage`
       */
      wrapper?: StorageWrapper;
    };
  }
  /**
   * Settings interface for JavaScript SDK instances created on Node.js, with server-side API and synchronous in-memory storage.
   * If your storage is asynchronous (Redis for example) use SplitIO.INodeAsyncSettings instead.
   *
   * @see {@link https://help.split.io/hc/en-us/articles/360020564931-Node-js-SDK#configuration}
   */
  interface INodeSettings extends IServerSideSharedSettings, ISyncSharedSettings, INonPluggableSharedSettings {
    /**
     * Defines which kind of storage we can instantiate on Node.js for 'standalone' mode.
     * The only possible storage type is 'MEMORY', which is the default.
     */
    storage?: {
      /**
       * Synchronous storage type to be instantiated by the SDK.
       *
       * @defaultValue `'MEMORY'`
       */
      type?: NodeSyncStorage;
      /**
       * Optional prefix to prevent any kind of data collision between SDK versions.
       *
       * @defaultValue `'SPLITIO'`
       */
      prefix?: string;
    };
    sync?: ISyncSharedSettings['sync'] & {
      /**
       * Custom options object for HTTP(S) requests in Node.js.
       * If provided, this object is merged with the options object passed by the SDK for EventSource and Node-Fetch calls.
       * @see {@link https://www.npmjs.com/package/node-fetch#options}
       */
      requestOptions?: {
        /**
         * Custom function called before each request, allowing you to add or update headers in SDK HTTP requests.
         * Some headers, such as `SplitSDKVersion`, are required by the SDK and cannot be overridden.
         * To pass multiple headers with the same name, combine their values into a single line, separated by commas. Example: `{ 'Authorization': 'value1, value2' }`
         * Or provide keys with different cases since headers are case-insensitive. Example: `{ 'authorization': 'value1', 'Authorization': 'value2' }`
         *
         * @defaultValue `undefined`
         *
         * @param context - The context for the request, which contains the `headers` property object representing the current headers in the request.
         * @returns An object representing a set of headers to be merged with the current headers.
         *
         * @example
         * ```
         * const factory = SplitFactory({
         *   ...
         *   sync: {
         *     getHeaderOverrides: (context) => {
         *       return {
         *         'Authorization': context.headers['Authorization'] + ', other-value',
         *         'custom-header': 'custom-value'
         *       };
         *     }
         *   }
         * });
         * ```
         */
        getHeaderOverrides?: (context: { headers: Record<string, string> }) => Record<string, string>;
        /**
         * Custom Node.js HTTP(S) Agent used by the SDK for HTTP(S) requests.
         *
         * You can use it, for example, for certificate pinning or setting a network proxy:
         *
         * ```
         * const { HttpsProxyAgent } = require('https-proxy-agent');
         *
         * const proxyAgent = new HttpsProxyAgent(process.env.HTTPS_PROXY || 'http://10.10.1.10:1080');
         *
         * const factory = SplitFactory({
         *   ...
         *   sync: {
         *     requestOptions: {
         *       agent: proxyAgent
         *     }
         *   }
         * })
         * ```
         *
         * @see {@link https://nodejs.org/api/https.html#class-httpsagent}
         *
         * @defaultValue `undefined`
         */
        agent?: RequestOptions['agent'];
      };
    };
  }
  /**
   * Settings interface for JavaScript SDK instances created on Node.js, with asynchronous storage like Redis.
   * If your storage is synchronous (by default we use memory, which is sync) use SplitIO.INodeSettings instead.
   *
   * @see {@link https://help.split.io/hc/en-us/articles/360020564931-Node-js-SDK#configuration}
   */
  interface INodeAsyncSettings extends IServerSideSharedSettings, ISharedSettings, INonPluggableSharedSettings {
    /**
     * The SDK mode. When using 'REDIS' storage type, the only possible value is "consumer", which is required.
     *
     * @see {@link https://help.split.io/hc/en-us/articles/360020564931-Node-js-SDK#state-sharing-redis-integration}
     */
    mode: 'consumer';
    /**
     * Defines which kind of async storage we can instantiate on Node.js for 'consumer' mode.
     * The only possible storage type is 'REDIS'.
     */
    storage: {
      /**
       * 'REDIS' storage type to be instantiated by the SDK.
       */
      type: NodeAsyncStorage;
      /**
       * Options to be passed to the Redis storage. Use it with storage type: 'REDIS'.
       */
      options?: {
        /**
         * Redis URL. If set, `host`, `port`, `db` and `pass` params will be ignored.
         *
         * Examples:
         * ```
         *   url: 'localhost'
         *   url: '127.0.0.1:6379'
         *   url: 'redis://:authpassword@127.0.0.1:6379/0'
         * ```
         */
        url?: string;
        /**
         * Redis host.
         *
         * @defaultValue `'localhost'`
         */
        host?: string;
        /**
         * Redis port.
         *
         * @defaultValue `6379`
         */
        port?: number;
        /**
         * Redis database to be used.
         *
         * @defaultValue `0`
         */
        db?: number;
        /**
         * Redis password. Don't define if no password is used.
         *
         * @defaultValue `undefined`
         */
        pass?: string;
        /**
         * The milliseconds before a timeout occurs during the initial connection to the Redis server.
         *
         * @defaultValue `10000`
         */
        connectionTimeout?: number;
        /**
         * The milliseconds before Redis commands are timeout by the SDK.
         * Method calls that involve Redis commands, like `client.getTreatment` or `client.track` calls, are resolved when the commands success or timeout.
         *
         * @defaultValue `5000`
         */
        operationTimeout?: number;
        /**
         * TLS configuration for Redis connection.
         * @see {@link https://www.npmjs.com/package/ioredis#tls-options }
         *
         * @defaultValue `undefined`
         */
        tls?: RedisOptions['tls'];
      };
      /**
       * Optional prefix to prevent any kind of data collision between SDK versions.
       *
       * @defaultValue `'SPLITIO'`
       */
      prefix?: string;
    };
  }
  /**
   * This represents the interface for the SDK instance with synchronous storage and client-side API,
   * i.e., where client instances have a bound user key.
   */
  interface IBrowserSDK extends IBasicSDK {
    /**
     * Returns the default client instance of the SDK, associated with the key provided on settings.
     *
     * @returns The client instance.
     */
    client(): IBrowserClient;
    /**
     * Returns a shared client of the SDK, associated with the given key.
     * @param key - The key for the new client instance.
     * @returns The client instance.
     */
    client(key: SplitKey): IBrowserClient;
    /**
     * Returns a manager instance of the SDK to explore available information.
     *
     * @returns The manager instance.
     */
    manager(): IManager;
    /**
     * User consent API.
     */
    UserConsent: IUserConsentAPI;
  }
  /**
   * This represents the interface for the SDK instance with asynchronous storage and client-side API,
   * i.e., where client instances have a bound user key.
   */
  interface IBrowserAsyncSDK extends IBasicSDK {
    /**
     * Returns the default client instance of the SDK, associated with the key provided on settings.
     *
     * @returns The asynchronous client instance.
     */
    client(): IBrowserAsyncClient;
    /**
     * Returns a shared client of the SDK, associated with the given key.
     *
     * @param key - The key for the new client instance.
     * @returns The asynchronous client instance.
     */
    client(key: SplitKey): IBrowserAsyncClient;
    /**
     * Returns a manager instance of the SDK to explore available information.
     *
     * @returns The manager instance.
     */
    manager(): IAsyncManager;
    /**
     * User consent API.
     */
    UserConsent: IUserConsentAPI;
  }
  /**
   * This represents the interface for the SDK instance for server-side with synchronous storage.
   */
  interface ISDK extends IBasicSDK {
    /**
     * Returns the default client instance of the SDK.
     *
     * @returns The client instance.
     */
    client(): IClient;
    /**
     * Returns a manager instance of the SDK to explore available information.
     *
     * @returns The manager instance.
     */
    manager(): IManager;
  }
  /**
   * This represents the interface for the SDK instance for server-side with asynchronous storage.
   */
  interface IAsyncSDK extends IBasicSDK {
    /**
     * Returns the default client instance of the SDK.
     *
     * @returns The asynchronous client instance.
     */
    client(): IAsyncClient;
    /**
     * Returns a manager instance of the SDK to explore available information.
     *
     * @returns The manager instance.
     */
    manager(): IAsyncManager;
  }
  /**
   * This represents the interface for the Client instance on server-side, where the user key is not bound to the instance and must be provided on each method call.
   * This interface is available in Node.js, or when importing the 'server' sub-package of JS SDK (e.g., `import { SplitFactory } from '@splitsoftware/splitio/server'`).
   */
  interface IClient extends IBasicClient {
    /**
     * Returns a Treatment value, which is the treatment string for the given feature.
     *
     * @param key - The string key representing the consumer.
     * @param featureFlagName - The string that represents the feature flag we want to get the treatment.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The treatment string.
     */
    getTreatment(key: SplitKey, featureFlagName: string, attributes?: Attributes, options?: EvaluationOptions): Treatment;
    /**
     * Returns a TreatmentWithConfig value, which is an object with both treatment and config string for the given feature.
     *
     * @param key - The string key representing the consumer.
     * @param featureFlagName - The string that represents the feature flag we want to get the treatment.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The TreatmentWithConfig object that contains the treatment string and the configuration stringified JSON (or null if there was no config for that treatment).
     */
    getTreatmentWithConfig(key: SplitKey, featureFlagName: string, attributes?: Attributes, options?: EvaluationOptions): TreatmentWithConfig;
    /**
     * Returns a Treatments value, which is an object map with the treatments for the given features.
     *
     * @param key - The string key representing the consumer.
     * @param featureFlagNames - An array of the feature flag names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The treatments object map.
     */
    getTreatments(key: SplitKey, featureFlagNames: string[], attributes?: Attributes, options?: EvaluationOptions): Treatments;
    /**
     * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given features.
     *
     * @param key - The string key representing the consumer.
     * @param featureFlagNames - An array of the feature flag names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The map with all the TreatmentWithConfig objects
     */
    getTreatmentsWithConfig(key: SplitKey, featureFlagNames: string[], attributes?: Attributes, options?: EvaluationOptions): TreatmentsWithConfig;
    /**
     * Returns a Treatments value, which is an object map with the treatments for the feature flags related to the given flag set.
     *
     * @param key - The string key representing the consumer.
     * @param flagSet - The flag set name we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The map with all the Treatment objects
     */
    getTreatmentsByFlagSet(key: SplitKey, flagSet: string, attributes?: Attributes, options?: EvaluationOptions): Treatments;
    /**
     * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the feature flags related to the given flag set.
     *
     * @param key - The string key representing the consumer.
     * @param flagSet - The flag set name we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The map with all the TreatmentWithConfig objects
     */
    getTreatmentsWithConfigByFlagSet(key: SplitKey, flagSet: string, attributes?: Attributes, options?: EvaluationOptions): TreatmentsWithConfig;
    /**
     * Returns a Returns a Treatments value, which is an object with both treatment and config string for to the feature flags related to the given flag sets.
     *
     * @param key - The string key representing the consumer.
     * @param flagSets - An array of the flag set names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The map with all the Treatment objects
     */
    getTreatmentsByFlagSets(key: SplitKey, flagSets: string[], attributes?: Attributes, options?: EvaluationOptions): Treatments;
    /**
     * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the feature flags related to the given flag sets.
     *
     * @param key - The string key representing the consumer.
     * @param flagSets - An array of the flag set names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The map with all the TreatmentWithConfig objects
     */
    getTreatmentsWithConfigByFlagSets(key: SplitKey, flagSets: string[], attributes?: Attributes, options?: EvaluationOptions): TreatmentsWithConfig;
    /**
     * Tracks an event to be fed to the results product on Split user interface.
     *
     * @param key - The key that identifies the entity related to this event.
     * @param trafficType - The traffic type of the entity related to this event. See {@link https://help.split.io/hc/en-us/articles/360019916311-Traffic-type}
     * @param eventType - The event type corresponding to this event.
     * @param value - The value of this event.
     * @param properties - The properties of this event. Values can be string, number, boolean or null.
     * @returns Whether the event was added to the queue successfully or not.
     */
    track(key: SplitKey, trafficType: string, eventType: string, value?: number, properties?: Properties): boolean;
  }
  /**
   * This represents the interface for the Client instance on server-side with asynchronous storage, like REDIS.
   * User key is not bound to the instance and must be provided on each method call, which returns a promise.
   * This interface is available in Node.js, or when importing the 'server' sub-package in JS SDK (e.g., `import { SplitFactory } from '@splitsoftware/splitio/server'`).
   */
  interface IAsyncClient extends IBasicClient {
    /**
     * Returns a Treatment value, which will be (or eventually be) the treatment string for the given feature.
     *
     * @param key - The string key representing the consumer.
     * @param featureFlagName - The string that represents the feature flag we want to get the treatment.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns Treatment promise that resolves to the treatment string.
     */
    getTreatment(key: SplitKey, featureFlagName: string, attributes?: Attributes, options?: EvaluationOptions): AsyncTreatment;
    /**
     * Returns a TreatmentWithConfig value, which will be (or eventually be) an object with both treatment and config string for the given feature.
     *
     * @param key - The string key representing the consumer.
     * @param featureFlagName - The string that represents the feature flag we want to get the treatment.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns TreatmentWithConfig promise that resolves to the TreatmentWithConfig object.
     */
    getTreatmentWithConfig(key: SplitKey, featureFlagName: string, attributes?: Attributes, options?: EvaluationOptions): AsyncTreatmentWithConfig;
    /**
     * Returns a Treatments value, which will be (or eventually be) an object map with the treatments for the given features.
     *
     * @param key - The string key representing the consumer.
     * @param featureFlagNames - An array of the feature flag names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns Treatments promise that resolves to the treatments object map.
     */
    getTreatments(key: SplitKey, featureFlagNames: string[], attributes?: Attributes, options?: EvaluationOptions): AsyncTreatments;
    /**
     * Returns a TreatmentsWithConfig value, which will be (or eventually be) an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given features.
     *
     * @param key - The string key representing the consumer.
     * @param featureFlagNames - An array of the feature flag names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns TreatmentsWithConfig promise that resolves to the map of TreatmentsWithConfig objects.
     */
    getTreatmentsWithConfig(key: SplitKey, featureFlagNames: string[], attributes?: Attributes, options?: EvaluationOptions): AsyncTreatmentsWithConfig;
    /**
     * Returns a Treatments value, which is an object map with the treatments for the feature flags related to the given flag set.
     *
     * @param key - The string key representing the consumer.
     * @param flagSet - The flag set name we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns Treatments promise that resolves to the treatments object map.
     */
    getTreatmentsByFlagSet(key: SplitKey, flagSet: string, attributes?: Attributes, options?: EvaluationOptions): AsyncTreatments;
    /**
     * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the feature flags related to the given flag set.
     *
     * @param key - The string key representing the consumer.
     * @param flagSet - The flag set name we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns TreatmentsWithConfig promise that resolves to the map of TreatmentsWithConfig objects.
     */
    getTreatmentsWithConfigByFlagSet(key: SplitKey, flagSet: string, attributes?: Attributes, options?: EvaluationOptions): AsyncTreatmentsWithConfig;
    /**
     * Returns a Returns a Treatments value, which is an object with both treatment and config string for to the feature flags related to the given flag sets.
     *
     * @param key - The string key representing the consumer.
     * @param flagSets - An array of the flag set names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns Treatments promise that resolves to the treatments object map.
     */
    getTreatmentsByFlagSets(key: SplitKey, flagSets: string[], attributes?: Attributes, options?: EvaluationOptions): AsyncTreatments;
    /**
     * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the feature flags related to the given flag sets.
     *
     * @param key - The string key representing the consumer.
     * @param flagSets - An array of the flag set names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns TreatmentsWithConfig promise that resolves to the map of TreatmentsWithConfig objects.
     */
    getTreatmentsWithConfigByFlagSets(key: SplitKey, flagSets: string[], attributes?: Attributes, options?: EvaluationOptions): AsyncTreatmentsWithConfig;
    /**
     * Tracks an event to be fed to the results product on Split user interface, and returns a promise to signal when the event was successfully queued (or not).
     *
     * @param key - The key that identifies the entity related to this event.
     * @param trafficType - The traffic type of the entity related to this event. See {@link https://help.split.io/hc/en-us/articles/360019916311-Traffic-type}
     * @param eventType - The event type corresponding to this event.
     * @param value - The value of this event.
     * @param properties - The properties of this event. Values can be string, number, boolean or null.
     * @returns A promise that resolves to a boolean indicating if the event was added to the queue successfully or not.
     */
    track(key: SplitKey, trafficType: string, eventType: string, value?: number, properties?: Properties): Promise<boolean>;
  }
  interface IClientWithAttributes extends IBasicClient {
    /**
     * Add an attribute to client's in-memory attributes storage.
     *
     * @param attributeName - Attribute name
     * @param attributeValue - Attribute value
     * @returns true if the attribute was stored and false otherwise
     */
    setAttribute(attributeName: string, attributeValue: AttributeType): boolean;
    /**
     * Returns the attribute with the given name.
     *
     * @param attributeName - Attribute name
     * @returns Attribute with the given name
     */
    getAttribute(attributeName: string): AttributeType;
    /**
     * Removes from client's in-memory attributes storage the attribute with the given name.
     *
     * @param attributeName - Attribute name
     * @returns true if attribute was removed and false otherwise
     */
    removeAttribute(attributeName: string): boolean;
    /**
     * Add to client's in-memory attributes storage the attributes in 'attributes'.
     *
     * @param attributes - Object with attributes to store
     * @returns true if attributes were stored an false otherwise
     */
    setAttributes(attributes: Attributes): boolean;
    /**
     * Return all the attributes stored in client's in-memory attributes storage.
     *
     * @returns returns all the stored attributes
     */
    getAttributes(): Attributes;
    /**
     * Remove all the stored attributes in the client's in-memory attribute storage.
     *
     * @returns true if all attribute were removed and false otherwise
     */
    clearAttributes(): boolean;
  }
  /**
   * This represents the interface for the Client instance on client-side, where the user key is bound to the instance on creation and does not need to be provided on each method call.
   */
  interface IBrowserClient extends IClientWithAttributes {
    /**
     * Returns a Treatment value, which is the treatment string for the given feature.
     *
     * @param featureFlagName - The string that represents the feature flag we want to get the treatment.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The treatment string.
     */
    getTreatment(featureFlagName: string, attributes?: Attributes, options?: EvaluationOptions): Treatment;
    /**
     * Returns a TreatmentWithConfig value, which is an object with both treatment and config string for the given feature.
     *
     * @param featureFlagName - The string that represents the feature flag we want to get the treatment.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The TreatmentWithConfig object that contains the treatment string and the configuration stringified JSON (or null if there was no config for that treatment).
     */
    getTreatmentWithConfig(featureFlagName: string, attributes?: Attributes, options?: EvaluationOptions): TreatmentWithConfig;
    /**
     * Returns a Treatments value, which is an object map with the treatments for the given features.
     *
     * @param featureFlagNames - An array of the feature flag names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The treatments object map.
     */
    getTreatments(featureFlagNames: string[], attributes?: Attributes, options?: EvaluationOptions): Treatments;
    /**
     * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given features.
     *
     * @param featureFlagNames - An array of the feature flag names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The map with all the TreatmentWithConfig objects
     */
    getTreatmentsWithConfig(featureFlagNames: string[], attributes?: Attributes, options?: EvaluationOptions): TreatmentsWithConfig;
    /**
     * Returns a Treatments value, which is an object map with the treatments for the feature flags related to the given flag set.
     *
     * @param flagSet - The flag set name we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The map with all the Treatments objects
     */
    getTreatmentsByFlagSet(flagSet: string, attributes?: Attributes, options?: EvaluationOptions): Treatments;
    /**
     * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the feature flags related to the given flag set.
     *
     * @param flagSet - The flag set name we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The map with all the TreatmentWithConfig objects
     */
    getTreatmentsWithConfigByFlagSet(flagSet: string, attributes?: Attributes, options?: EvaluationOptions): TreatmentsWithConfig;
    /**
     * Returns a Returns a Treatments value, which is an object with both treatment and config string for to the feature flags related to the given flag sets.
     *
     * @param flagSets - An array of the flag set names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The map with all the Treatments objects
     */
    getTreatmentsByFlagSets(flagSets: string[], attributes?: Attributes, options?: EvaluationOptions): Treatments;
    /**
     * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the feature flags related to the given flag sets.
     *
     * @param flagSets - An array of the flag set names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns The map with all the TreatmentWithConfig objects
     */
    getTreatmentsWithConfigByFlagSets(flagSets: string[], attributes?: Attributes, options?: EvaluationOptions): TreatmentsWithConfig;
    /**
     * Tracks an event to be fed to the results product on Split user interface.
     *
     * @param trafficType - The traffic type of the entity related to this event. See {@link https://help.split.io/hc/en-us/articles/360019916311-Traffic-type}
     * @param eventType - The event type corresponding to this event.
     * @param value - The value of this event.
     * @param properties - The properties of this event. Values can be string, number, boolean or null.
     * @returns Whether the event was added to the queue successfully or not.
     */
    track(trafficType: string, eventType: string, value?: number, properties?: Properties): boolean;
  }
  /**
   * This represents the interface for the Client instance with asynchronous storage for client-side SDK, where each client has associated a key.
   */
  interface IBrowserAsyncClient extends IClientWithAttributes {
    /**
     * Returns a Treatment value, which will be (or eventually be) the treatment string for the given feature.
     *
     * @param featureFlagName - The string that represents the feature flag we want to get the treatment.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns Treatment promise that resolves to the treatment string.
     */
    getTreatment(featureFlagName: string, attributes?: Attributes, options?: EvaluationOptions): AsyncTreatment;
    /**
     * Returns a TreatmentWithConfig value, which will be (or eventually be) an object with both treatment and config string for the given feature.
     *
     * @param featureFlagName - The string that represents the feature flag we want to get the treatment.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns TreatmentWithConfig promise that resolves to the TreatmentWithConfig object.
     */
    getTreatmentWithConfig(featureFlagName: string, attributes?: Attributes, options?: EvaluationOptions): AsyncTreatmentWithConfig;
    /**
     * Returns a Treatments value, which will be (or eventually be) an object map with the treatments for the given features.
     *
     * @param featureFlagNames - An array of the feature flag names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns Treatments promise that resolves to the treatments object map.
     */
    getTreatments(featureFlagNames: string[], attributes?: Attributes, options?: EvaluationOptions): AsyncTreatments;
    /**
     * Returns a TreatmentsWithConfig value, which will be (or eventually be) an object map with the TreatmentWithConfig (an object with both treatment and config string) for the given features.
     *
     * @param featureFlagNames - An array of the feature flag names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns TreatmentsWithConfig promise that resolves to the TreatmentsWithConfig object.
     */
    getTreatmentsWithConfig(featureFlagNames: string[], attributes?: Attributes, options?: EvaluationOptions): AsyncTreatmentsWithConfig;
    /**
     * Returns a Treatments value, which is an object map with the treatments for the feature flags related to the given flag set.
     *
     * @param flagSet - The flag set name we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns Treatments promise that resolves to the treatments object map.
     */
    getTreatmentsByFlagSet(flagSet: string, attributes?: Attributes, options?: EvaluationOptions): AsyncTreatments;
    /**
     * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the feature flags related to the given flag set.
     *
     * @param flagSet - The flag set name we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns TreatmentsWithConfig promise that resolves to the TreatmentsWithConfig object.
     */
    getTreatmentsWithConfigByFlagSet(flagSet: string, attributes?: Attributes, options?: EvaluationOptions): AsyncTreatmentsWithConfig;
    /**
     * Returns a Returns a Treatments value, which is an object with both treatment and config string for to the feature flags related to the given flag sets.
     *
     * @param flagSets - An array of the flag set names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns Treatments promise that resolves to the treatments object map.
     */
    getTreatmentsByFlagSets(flagSets: string[], attributes?: Attributes, options?: EvaluationOptions): AsyncTreatments;
    /**
     * Returns a TreatmentsWithConfig value, which is an object map with the TreatmentWithConfig (an object with both treatment and config string) for the feature flags related to the given flag sets.
     *
     * @param flagSets - An array of the flag set names we want to get the treatments.
     * @param attributes - An object of type Attributes defining the attributes for the given key.
     * @param options - An object of type EvaluationOptions for advanced evaluation options.
     * @returns TreatmentsWithConfig promise that resolves to the TreatmentsWithConfig object.
     */
    getTreatmentsWithConfigByFlagSets(flagSets: string[], attributes?: Attributes, options?: EvaluationOptions): AsyncTreatmentsWithConfig;
    /**
     * Tracks an event to be fed to the results product on Split user interface, and returns a promise to signal when the event was successfully queued (or not).
     *
     * @param trafficType - The traffic type of the entity related to this event.
     * @param eventType - The event type corresponding to this event.
     * @param value - The value of this event.
     * @param properties - The properties of this event. Values can be string, number, boolean or null.
     * @returns A promise that resolves to a boolean indicating if the event was added to the queue successfully or not.
     */
    track(trafficType: string, eventType: string, value?: number, properties?: Properties): Promise<boolean>;
  }
  /**
   * Representation of a manager instance with synchronous storage of the SDK.
   */
  interface IManager extends IStatusInterface {
    /**
     * Get the array of feature flag names.
     *
     * @returns The list of feature flag names.
     */
    names(): SplitNames;
    /**
     * Get the array of feature flags data in SplitView format.
     *
     * @returns The list of SplitIO.SplitView.
     */
    splits(): SplitViews;
    /**
     * Get the data of a feature flag in SplitView format.
     *
     * @param featureFlagName - The name of the feature flag we want to get info of.
     * @returns The SplitIO.SplitView of the given feature flag name or null if the feature flag is not found.
     */
    split(featureFlagName: string): SplitView | null;
  }
  /**
   * Representation of a manager instance with asynchronous storage of the SDK.
   */
  interface IAsyncManager extends IStatusInterface {
    /**
     * Get the array of feature flag names.
     *
     * @returns A promise that resolves to the list of feature flag names.
     */
    names(): SplitNamesAsync;
    /**
     * Get the array of feature flags data in SplitView format.
     *
     * @returns A promise that resolves to the SplitIO.SplitView list.
     */
    splits(): SplitViewsAsync;
    /**
     * Get the data of a feature flag in SplitView format.
     *
     * @param featureFlagName - The name of the feature flag we want to get info of.
     * @returns A promise that resolves to the SplitIO.SplitView value.
     */
    split(featureFlagName: string): SplitViewAsync;
  }
}
