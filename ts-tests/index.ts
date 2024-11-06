/**
 * Split software typescript declarations testing.
 *
 * This file is not meant to run but to be compiled without errors. This is the same way to test .d.ts files
 * that you will need to comply to publish packages on @types organization on NPM (DefinitelyTyped).
 * We import the declarations through the NPM package name (using the development branch of the repo)
 * to test in the same way in which customers will be using it on development.
 *
 * The step of compiling this file is part of the continous integration systems in place.
 */

import '../types/index';

let stringPromise: Promise<string>;
let splitNamesPromise: Promise<SplitIO.SplitNames>;
let splitViewPromise: Promise<SplitIO.SplitView>;
let splitViewsPromise: Promise<SplitIO.SplitViews>;
let treatmentsPromise: Promise<SplitIO.Treatments>;
let treatmentWithConfigPromise: Promise<SplitIO.TreatmentWithConfig>;
let treatmentsWithConfigPromise: Promise<SplitIO.TreatmentsWithConfig>;
let trackPromise: Promise<boolean>;

/**** Interfaces ****/

// Facade return interface
let SDK: SplitIO.ISDK;
// let AsyncSDK: SplitIO.IAsyncSDK;
let BrowserSDK: SplitIO.IBrowserSDK;
// let AsyncBrowserSDK: SplitIO.IAsyncSDKWithKey;

// Client & Manager APIs
let client: SplitIO.IClient;
let browserClient: SplitIO.IBrowserClient;
let manager: SplitIO.IManager;
let asyncClient: SplitIO.IAsyncClient;
let asyncBrowserClient: SplitIO.IBrowserAsyncClient;
let asyncManager: SplitIO.IAsyncManager;

/**** Custom Types ****/

// Common
let treatment: SplitIO.Treatment = 'on';
let treatmentWithConfig: SplitIO.TreatmentWithConfig = {
  treatment: 'control',
  config: null
};
treatmentWithConfig = { treatment: 'off', config: '{}' };
let asyncTreatment: SplitIO.AsyncTreatment = stringPromise;
let asyncTreatmentWithConfig: SplitIO.AsyncTreatmentWithConfig = treatmentWithConfigPromise;
let tracked: boolean;
let treatmentsMap: SplitIO.Treatments = {
  feature1: 'on',
  feature2: 'control'
};
let treatmentsWithConfigMap: SplitIO.TreatmentsWithConfig = {
  feature1: { treatment: 'control', config: null },
  feature2: { treatment: 'off', config: '{"color":"blue"}' }
};
let treatments: SplitIO.Treatments = treatmentsMap;
let treatmentsWithConfig: SplitIO.TreatmentsWithConfig = treatmentsWithConfigMap;
let asyncTreatments: SplitIO.AsyncTreatments = treatmentsPromise;
let asyncTreatmentsWithConfig: SplitIO.AsyncTreatmentsWithConfig = treatmentsWithConfigPromise;
let splitEvent: SplitIO.Event;
const attributes: SplitIO.Attributes = {
  attr1: 1,
  attr2: '2',
  attr3: Date.now(),
  attr4: ['str1', 2],
  attr5: ['str1', 'str2'],
  attr6: [1, 2],
  attr7: true
};
const splitKeyObj: SplitIO.SplitKeyObject = {
  matchingKey: 'matchingKey',
  bucketingKey: 'bucketingKey'
};
let splitKey: SplitIO.SplitKey;
// Mocks
let mockedFeaturesPath: SplitIO.MockedFeaturesFilePath;
let mockedFeaturesMap: SplitIO.MockedFeaturesMap;
// Split Data
let splitView: SplitIO.SplitView;
let splitViews: SplitIO.SplitViews;
let splitNames: SplitIO.SplitNames;
let splitNamesAsync: SplitIO.SplitNamesAsync;
let splitViewAsync: SplitIO.SplitViewAsync;
let splitViewsAsync: SplitIO.SplitViewsAsync;
// Impression data
let impressionData: SplitIO.ImpressionData;

mockedFeaturesPath = 'path/to/file';
mockedFeaturesMap = {
  feature1: 'treatment',
  feature2: { treatment: 'treatment2', config: "{ 'prop': 'value'}" },
  feature3: { treatment: 'treatment3', config: null }
};

// Treatment can be the string or the promise which will resolve to treatment string
treatment = 'some treatment';  // Sync case
asyncTreatment = stringPromise;  // Async case

// Treatments can be the object or the promise which will resolve to treatments object
treatments = {
  someFeature: 'treatment'
}; // Sync
asyncTreatments = treatmentsPromise;  // Async

// SplitViews can be the SplitViewData or the promise which will resolve to SplitViewData obj
splitView = {
  name: 'asd',
  killed: false,
  trafficType: 'user',
  treatments: ['on', 'off'],
  changeNumber: 18294,
  configs: {
    off: '{"dimensions":"{\"height\":20,\"width\":40}"}'
  },
  sets: ['flag_set_1', 'flag_set_2'],
  defaultTreatment: 'off'
};
splitViews = [splitView];

splitViewAsync = splitViewPromise;
splitNamesAsync = splitNamesPromise;
splitViewsAsync = splitViewsPromise;

// Split key could be a split key object or a string
splitKey = 'someKey';
splitKey = splitKeyObj;

/**** Tests for ISDK interface ****/

// The settings values the SDK expose.
const instantiatedSettingsCore: {
  authorizationKey: string,
  key?: SplitIO.SplitKey,
  trafficType?: string,
  labelsEnabled: boolean,
  IPAddressesEnabled?: boolean
} = SDK.settings.core;
const instantiatedSettingsMode: ('standalone' | 'consumer' | 'localhost' | 'consumer_partial') = SDK.settings.mode;
const instantiatedSettingsScheduler: { [key: string]: number } = SDK.settings.scheduler;
const instantiatedSettingsStartup: { [key: string]: number } = SDK.settings.startup;
const instantiatedSettingsStorage = SDK.settings.storage as SplitIO.StorageOptions;
const instantiatedSettingsUrls: { [key: string]: string } = SDK.settings.urls;
const instantiatedSettingsVersion: string = SDK.settings.version;
let instantiatedSettingsFeatures = SDK.settings.features as SplitIO.MockedFeaturesMap;
// We should be able to write on features prop. The rest are readonly props.
instantiatedSettingsFeatures.something = 'something';
SDK.settings.features = 'new_file_path'; // Node
SDK.settings.features = { 'split_x': 'on' }; // Browser

// Logger
SDK.Logger.enable();
SDK.Logger.setLogLevel(SDK.Logger.LogLevel.DEBUG);
SDK.Logger.setLogLevel(SDK.Logger.LogLevel.INFO);
SDK.Logger.setLogLevel(SDK.Logger.LogLevel.WARN);
SDK.Logger.setLogLevel(SDK.Logger.LogLevel.ERROR);
SDK.Logger.setLogLevel(SDK.Logger.LogLevel.NONE);
SDK.Logger.disable();

BrowserSDK.Logger.enable();
BrowserSDK.Logger.setLogLevel(BrowserSDK.Logger.LogLevel.DEBUG);
BrowserSDK.Logger.setLogLevel(BrowserSDK.Logger.LogLevel.INFO);
BrowserSDK.Logger.setLogLevel(BrowserSDK.Logger.LogLevel.WARN);
BrowserSDK.Logger.setLogLevel(BrowserSDK.Logger.LogLevel.ERROR);
BrowserSDK.Logger.setLogLevel(BrowserSDK.Logger.LogLevel.NONE);
BrowserSDK.Logger.disable();

/**** Tests for IClient interface ****/

// Events constants we get
const eventConsts: { [key: string]: SplitIO.Event } = client.Event;
splitEvent = client.Event.SDK_READY;
splitEvent = client.Event.SDK_READY_FROM_CACHE;
splitEvent = client.Event.SDK_READY_TIMED_OUT;
splitEvent = client.Event.SDK_UPDATE;

// Ready and destroy
const readyPromise: Promise<void> = client.ready();
const destroyPromise: Promise<void> = client.destroy();

// We can call getTreatment
treatment = client.getTreatment(splitKey, 'mySplit');
treatment = browserClient.getTreatment('mySplit');

// Attributes parameter is optional on both signatures
treatment = client.getTreatment(splitKey, 'mySplit', attributes);
treatment = browserClient.getTreatment('mySplit', attributes);

// We can call getTreatments
treatments = client.getTreatments(splitKey, ['mySplit']);
treatments = browserClient.getTreatments(['mySplit']);

// Attributes parameter is optional on both signatures
treatments = client.getTreatments(splitKey, ['mySplit'], attributes);
treatments = browserClient.getTreatments(['mySplit'], attributes);

// We can call getTreatmentWithConfig
treatmentWithConfig = client.getTreatmentWithConfig(splitKey, 'mySplit');
treatmentWithConfig = browserClient.getTreatmentWithConfig('mySplit');

// Attributes parameter is optional on both signatures
treatmentWithConfig = client.getTreatmentWithConfig(splitKey, 'mySplit', attributes);
treatmentWithConfig = browserClient.getTreatmentWithConfig('mySplit', attributes);

// We can call getTreatmentsWithConfig
treatmentsWithConfig = client.getTreatmentsWithConfig(splitKey, ['mySplit']);
treatmentsWithConfig = browserClient.getTreatmentsWithConfig(['mySplit']);

// Attributes parameter is optional on both signatures
treatmentsWithConfig = client.getTreatmentsWithConfig(splitKey, ['mySplit'], attributes);
treatmentsWithConfig = browserClient.getTreatmentsWithConfig(['mySplit'], attributes);

// We can call track
tracked = client.track(splitKey, 'myTrafficType', 'myEventType'); // all params
tracked = browserClient.track('myTrafficType', 'myEventType'); // key binded, tt provided
// tracked = browserClient.track('myEventType'); // key and tt binded only in JS SDK

// Value parameter is optional on all signatures
tracked = client.track(splitKey, 'myTrafficType', 'myEventType', 10);
tracked = browserClient.track('myTrafficType', 'myEventType', 10);
// tracked = browserClient.track('myEventType', 10); // key and tt binded only in JS SDK

// Properties parameter is optional on all signatures.
tracked = client.track(splitKey, 'myTrafficType', 'myEventType', 10, { prop1: 1, prop2: '2', prop3: false, prop4: null });
tracked = browserClient.track('myTrafficType', 'myEventType', null, { prop1: 1, prop2: '2', prop3: false, prop4: null });
// tracked = browserClient.track('myEventType', undefined, { prop1: 1, prop2: '2', prop3: false, prop4: null }); // key and tt binded only in JS SDK.

/*** Repeating tests for Async Clients ***/

// Events constants we get (same as for sync client, just for interface checking)
const eventConstsAsync: { [key: string]: SplitIO.Event } = asyncClient.Event;
splitEvent = asyncClient.Event.SDK_READY;
splitEvent = asyncClient.Event.SDK_READY_FROM_CACHE;
splitEvent = asyncClient.Event.SDK_READY_TIMED_OUT;
splitEvent = asyncClient.Event.SDK_UPDATE;

// Ready and destroy (same as for sync client, just for interface checking)
const readyPromise1: Promise<void> = asyncClient.ready();
asyncClient.destroy();

// We can call getTreatment
asyncTreatment = asyncClient.getTreatment(splitKey, 'mySplit');
asyncTreatment = asyncBrowserClient.getTreatment('mySplit');

// Attributes parameter is optional
asyncTreatment = asyncClient.getTreatment(splitKey, 'mySplit', attributes);
asyncTreatment = asyncBrowserClient.getTreatment('mySplit', attributes);

// We can call getTreatments
asyncTreatments = asyncClient.getTreatments(splitKey, ['mySplit']);
asyncTreatments = asyncBrowserClient.getTreatments(['mySplit']);

// Attributes parameter is optional
asyncTreatments = asyncClient.getTreatments(splitKey, ['mySplit'], attributes);
asyncTreatments = asyncBrowserClient.getTreatments(['mySplit'], attributes);

// We can call getTreatmentWithConfig
asyncTreatmentWithConfig = asyncClient.getTreatmentWithConfig(splitKey, 'mySplit');
asyncTreatmentWithConfig = asyncBrowserClient.getTreatmentWithConfig('mySplit');

// Attributes parameter is optional
asyncTreatmentWithConfig = asyncClient.getTreatmentWithConfig(splitKey, 'mySplit', attributes);
asyncTreatmentWithConfig = asyncBrowserClient.getTreatmentWithConfig('mySplit', attributes);

// We can call getTreatmentsWithConfig
asyncTreatmentsWithConfig = asyncClient.getTreatmentsWithConfig(splitKey, ['mySplit']);
asyncTreatmentsWithConfig = asyncBrowserClient.getTreatmentsWithConfig(['mySplit']);

// Attributes parameter is optional
asyncTreatmentsWithConfig = asyncClient.getTreatmentsWithConfig(splitKey, ['mySplit'], attributes);
asyncTreatmentsWithConfig = asyncBrowserClient.getTreatmentsWithConfig(['mySplit'], attributes);

// We can call track
trackPromise = asyncClient.track(splitKey, 'myTrafficType', 'myEventType'); // all required params
trackPromise = asyncBrowserClient.track('myTrafficType', 'myEventType'); // all required params

// Value parameter is optional
trackPromise = asyncClient.track(splitKey, 'myTrafficType', 'myEventType', 10);
trackPromise = asyncBrowserClient.track('myTrafficType', 'myEventType', 10);

// Properties parameter is optional
trackPromise = asyncClient.track(splitKey, 'myTrafficType', 'myEventType', 10, { prop1: 1, prop2: '2', prop3: true, prop4: null });
trackPromise = asyncBrowserClient.track('myTrafficType', 'myEventType', 10, { prop1: 1, prop2: '2', prop3: true, prop4: null });

/**** Tests for IManager interface ****/

splitNames = manager.names();
splitView = manager.split('mySplit');
splitViews = manager.splits();

// Manager implements ready promise.
const managerReadyPromise: Promise<void> = manager.ready();

// manager exposes Event constants too
const managerEventConsts: { [key: string]: SplitIO.Event } = manager.Event;
splitEvent = manager.Event.SDK_READY;
splitEvent = manager.Event.SDK_READY_FROM_CACHE;
splitEvent = manager.Event.SDK_READY_TIMED_OUT;
splitEvent = manager.Event.SDK_UPDATE;

/*** Repeating tests for Async Manager ***/

splitNamesAsync = asyncManager.names();
splitViewAsync = asyncManager.split('mySplit');
splitViewsAsync = asyncManager.splits();

// asyncManager implements ready promise.
const asyncManagerReadyPromise: Promise<void> = asyncManager.ready();

// asyncManager exposes Event constants too
const asyncManagerEventConsts: { [key: string]: SplitIO.Event } = asyncManager.Event;
splitEvent = asyncManager.Event.SDK_READY;
splitEvent = asyncManager.Event.SDK_READY_FROM_CACHE;
splitEvent = asyncManager.Event.SDK_READY_TIMED_OUT;
splitEvent = asyncManager.Event.SDK_UPDATE;

/*** Tests for IImpressionListener interface ***/
class MyImprListener implements SplitIO.IImpressionListener {
  logImpression(data: SplitIO.ImpressionData) {
    impressionData = data;
  }
}

const MyImprListenerMap: SplitIO.IImpressionListener = {
  logImpression: (data: SplitIO.ImpressionData) => {
    impressionData = data;
  }
};

let impressionListener: SplitIO.IImpressionListener;
impressionListener = MyImprListenerMap;
impressionListener = new MyImprListener();
impressionListener.logImpression(impressionData);

/**** Tests for attribute binding ****/
let stored: boolean = browserClient.setAttribute('stringAttribute', 'value');
stored = browserClient.setAttribute('numberAttribtue', 1);
stored = browserClient.setAttribute('booleanAttribute', true);
stored = browserClient.setAttribute('stringArrayAttribute', ['value1', 'value2']);
stored = browserClient.setAttribute('numberArrayAttribute', [1, 2]);

let storedAttributeValue: SplitIO.AttributeType = browserClient.getAttribute('stringAttribute');
storedAttributeValue = browserClient.getAttribute('numberAttribute');
storedAttributeValue = browserClient.getAttribute('booleanAttribute');
storedAttributeValue = browserClient.getAttribute('stringArrayAttribute');
storedAttributeValue = browserClient.getAttribute('numberArrayAttribute');

let removed: boolean = browserClient.removeAttribute('numberAttribute');
removed = browserClient.clearAttributes();

let attr: SplitIO.Attributes = {
  stringAttribute: 'value',
  numberAttribute: 1,
  booleanAttribute: true,
  stringArrayAttribute: ['value1', 'value2'],
  numberArrayAttribute: [1, 2]
};

stored = browserClient.setAttributes(attr);
let storedAttr: SplitIO.Attributes = browserClient.getAttributes();
removed = browserClient.clearAttributes();

/**** Tests for user consent API ****/

let userConsent: SplitIO.ConsentStatus;
userConsent = BrowserSDK.UserConsent.getStatus();
BrowserSDK.UserConsent.setStatus(true);
BrowserSDK.UserConsent.setStatus(false);
userConsent = BrowserSDK.UserConsent.Status.DECLINED;
userConsent = BrowserSDK.UserConsent.Status.GRANTED;
userConsent = BrowserSDK.UserConsent.Status.UNKNOWN;
