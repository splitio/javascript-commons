import { ISdkFactoryParams } from '../types';
import { sdkFactory } from '../index';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';
import { SplitIO } from '../../types';
import { EventEmitter } from '../../utils/MinEvents';

/** Mocks */

const clientInstance = 'client';
const managerInstance = 'manager';
const mockStorage = {
  splits: jest.fn(),
  events: jest.fn(),
  impressions: jest.fn()
};
const loggerApiMock = 'loggerApi';
jest.mock('../../logger/sdkLogger', () => {
  return {
    createLoggerAPI: () => loggerApiMock
  };
});
const telemetryTrackerMock = 'telemetryTracker';
jest.mock('../../trackers/telemetryTracker', () => {
  return {
    telemetryTrackerFactory: () => telemetryTrackerMock
  };
});

// IAsyncSDK, minimal params
const paramsForAsyncSDK = {
  settings: fullSettings,
  storageFactory: jest.fn(() => mockStorage),
  sdkClientMethodFactory: jest.fn(() => clientInstance),
  sdkManagerFactory: jest.fn(() => managerInstance),
  platform: {
    EventEmitter
  },
};

const SignalListenerInstanceMock = { start: jest.fn() };

// ISDK, full params
const fullParamsForSyncSDK = {
  ...paramsForAsyncSDK,
  syncManagerFactory: jest.fn(),
  SignalListener: jest.fn(() => SignalListenerInstanceMock),
  impressionsObserverFactory: jest.fn(),
  platform: {
    getEventSource: jest.fn(),
    getFetch: jest.fn(),
    getOptions: jest.fn(),
    EventEmitter
  },
  splitApiFactory: jest.fn(),
  impressionListener: 'impressionListener',
  integrationsManagerFactory: jest.fn(),
};

/** End Mocks */

function assertSdkApi(sdk: SplitIO.IAsyncSDK | SplitIO.ISDK | SplitIO.ICsSDK, params: any) {
  expect(sdk.Logger).toBe(loggerApiMock);
  expect(sdk.settings).toBe(params.settings);
  expect(sdk.client).toBe(params.sdkClientMethodFactory.mock.results[0].value);
  expect(sdk.manager()).toBe(params.sdkManagerFactory.mock.results[0].value);
}

function assertModulesCalled(params: any) {
  expect(params.storageFactory).toBeCalledTimes(1);
  expect(params.sdkClientMethodFactory).toBeCalledTimes(1);
  expect(params.sdkManagerFactory).toBeCalledTimes(1);
  if (params.syncManagerFactory) {
    expect(params.syncManagerFactory).toBeCalledTimes(1);
  }
  if (params.impressionsObserverFactory) {
    expect(params.impressionsObserverFactory).toBeCalledTimes(1);
  }
  if (params.SignalListener) {
    expect(params.SignalListener).toBeCalledTimes(1);
    expect(SignalListenerInstanceMock.start).toBeCalledTimes(1);
  }
  if (params.splitApiFactory) {
    expect(params.splitApiFactory.mock.calls).toEqual([[params.settings, params.platform, telemetryTrackerMock]]);
  }
  if (params.integrationsManagerFactory) {
    expect(params.integrationsManagerFactory.mock.calls).toEqual([[{ settings: params.settings, storage: mockStorage, telemetryTracker: telemetryTrackerMock }]]);
  }
}

describe('sdkFactory', () => {

  afterEach(jest.clearAllMocks);

  test('creates IAsyncSDK instance', () => {

    const sdk = sdkFactory(paramsForAsyncSDK as unknown as ISdkFactoryParams);

    // should return an object that conforms to SDK interface
    assertSdkApi(sdk, paramsForAsyncSDK);

    assertModulesCalled(paramsForAsyncSDK);
  });

  test('creates ISDK instance', () => {
    const sdk = sdkFactory(fullParamsForSyncSDK as unknown as ISdkFactoryParams);

    // should return an object that conforms to SDK interface
    assertSdkApi(sdk, fullParamsForSyncSDK);

    assertModulesCalled(fullParamsForSyncSDK);
  });
});
