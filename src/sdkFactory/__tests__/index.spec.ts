import { ISdkFactoryParams } from '../types';
import { sdkFactory } from '../index';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';
import SplitIO from '../../../types/splitio';
import { EventEmitter } from '../../utils/MinEvents';
import { FallbackTreatmentsCalculator } from '../../evaluator/fallbackTreatmentsCalculator';

/** Mocks */

const clientInstance = { destroy: jest.fn() };
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

// IBrowserAsyncSDK, minimal params
const paramsForAsyncSDK = {
  settings: fullSettings,
  storageFactory: jest.fn(() => mockStorage),
  sdkClientMethodFactory: jest.fn(({ clients }) => (key?: string) => { clients[key || ''] = clientInstance; return clientInstance; }),
  sdkManagerFactory: jest.fn(() => managerInstance),
  impressionsObserverFactory: jest.fn(),
  platform: {
    EventEmitter
  },
  fallbackTreatmentsCalculator: new FallbackTreatmentsCalculator(fullSettings.log)
};

const SignalListenerInstanceMock = { start: jest.fn() };

// IBrowserSDK, full params
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

function assertSdkApi(sdk: SplitIO.IAsyncSDK | SplitIO.ISDK | SplitIO.IBrowserAsyncSDK | SplitIO.IBrowserSDK, params: any) {
  expect(sdk.Logger).toBe(loggerApiMock);
  expect(sdk.settings).toBe(params.settings);
  expect(sdk.client).toBe(params.sdkClientMethodFactory.mock.results[0].value);
  expect(sdk.manager()).toBe(params.sdkManagerFactory.mock.results[0].value);
  expect(sdk.destroy()).toBeDefined();
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

  test.each([paramsForAsyncSDK, fullParamsForSyncSDK])('creates SDK instance', async (params) => {

    const sdk = sdkFactory(params as unknown as ISdkFactoryParams);

    // should return an object that conforms to SDK interface
    assertSdkApi(sdk, params);

    assertModulesCalled(params);

    // Factory destroy should call client destroy
    expect(sdk.client()).toBe(clientInstance);
    expect(await sdk.destroy()).toBeUndefined();
    expect(sdk.client().destroy).toBeCalledTimes(1);
  });
});
