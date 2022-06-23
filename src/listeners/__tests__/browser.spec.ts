import { BrowserSignalListener } from '../browser';
import { IEventsCacheSync, IImpressionCountsCacheSync, IImpressionsCacheSync, IStorageSync } from '../../storages/types';
import { ISplitApi } from '../../services/types';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';

jest.mock('../../sync/submitters/telemetrySubmitter', () => {
  return {
    telemetryCacheStatsAdapter: () => {
      return {
        isEmpty: () => false,
        clear: () => { },
        pop: () => ({}),
      };
    }
  };
});

/* Mocks start */

const fakeImpression = {
  feature: 'splitName',
  keyName: 'facundo@split.io',
  treatment: 'off',
  time: Date.now(),
  bucketingKey: null,
  label: null,
  changeNumber: null
};
const fakeEvent = {
  eventTypeId: 'someEvent',
  trafficTypeName: 'sometraffictype',
  value: null,
  timestamp: null,
  key: 'facundo@split.io',
  properties: null
};
const fakeImpressionCounts = {
  'someFeature::0': 1
};

// Storage with impressionsCount and telemetry cache
const fakeStorageOptimized = { // @ts-expect-error
  impressions: {
    isEmpty: jest.fn(),
    clear: jest.fn(),
    pop() {
      return [fakeImpression];
    }
  } as IImpressionsCacheSync, // @ts-expect-error
  events: {
    isEmpty: jest.fn(),
    clear: jest.fn(),
    pop() {
      return [fakeEvent];
    }
  } as IEventsCacheSync, // @ts-expect-error
  impressionCounts: {
    isEmpty: jest.fn(),
    clear: jest.fn(),
    pop() {
      return fakeImpressionCounts;
    }
  } as IImpressionCountsCacheSync,
  telemetry: {}
};

const fakeStorageDebug = {
  impressions: fakeStorageOptimized.impressions,
  events: fakeStorageOptimized.events
};

// @ts-expect-error
const fakeSplitApi = {
  postTestImpressionsBulk: jest.fn(() => Promise.resolve()),
  postEventsBulk: jest.fn(() => Promise.resolve()),
  postTestImpressionsCount: jest.fn(() => Promise.resolve()),
  postMetricsUsage: jest.fn(() => Promise.resolve()),
} as ISplitApi;

const VISIBILITYCHANGE_EVENT = 'visibilitychange';
const PAGEHIDE_EVENT = 'pagehide';
const UNLOAD_DOM_EVENT = 'unload';

const eventListeners: any = {
  [VISIBILITYCHANGE_EVENT]: new Set<() => any>(),
  [PAGEHIDE_EVENT]: new Set<() => any>(),
  [UNLOAD_DOM_EVENT]: new Set<() => any>()
};

// mock window and navigator objects
beforeAll(() => {
  Object.defineProperty(global, 'window', {
    value: {
      addEventListener: jest.fn((event, cb) => {
        if (eventListeners[event]) eventListeners[event].add(cb);
      }),
      removeEventListener: jest.fn((event, cb) => {
        if (eventListeners[event]) eventListeners[event].delete(cb);
      }),
      navigator: {
        sendBeacon: jest.fn(() => true)
      },
      document: {
        visibilityState: 'visible'
      }
    }
  });
  Object.defineProperty(global, 'navigator', {
    value: global.window.navigator
  });
  Object.defineProperty(global, 'document', {
    value: global.window.document
  });
});

// clear mocks
beforeEach(() => {
  (global.window.addEventListener as jest.Mock).mockClear();
  (global.window.removeEventListener as jest.Mock).mockClear();
  if (global.window.navigator.sendBeacon) (global.window.navigator.sendBeacon as jest.Mock).mockClear();
  Object.values(fakeSplitApi).forEach(method => method.mockClear()); // @ts-expect-error
  global.document.visibilityState = 'visible';
});

// delete mocks from global
afterAll(() => {
  // @ts-expect-error
  delete global.window; // @ts-expect-error
  delete global.navigator;
});

function triggerEvent(event: string, visibilityState?: string) { // @ts-expect-error
  if (visibilityState) global.document.visibilityState = visibilityState;
  eventListeners[event].forEach((cb: () => any) => cb());
}

/* Mocks end */

test('Browser JS listener / consumer mode', () => {
  // No SyncManager ==> consumer mode
  const listener = new BrowserSignalListener(undefined, fullSettings, fakeStorageOptimized as IStorageSync, fakeSplitApi);

  listener.start();

  // Assigned right function to right signal.
  const eventListeners = [[VISIBILITYCHANGE_EVENT, listener.flushDataIfHidden], [PAGEHIDE_EVENT, listener.flushData], [UNLOAD_DOM_EVENT, listener.stopSync]];
  expect((global.window.addEventListener as jest.Mock).mock.calls).toEqual(eventListeners);

  triggerEvent(VISIBILITYCHANGE_EVENT, 'hidden');
  triggerEvent(PAGEHIDE_EVENT);
  triggerEvent(UNLOAD_DOM_EVENT);

  // Unload event was triggered, but sendBeacon and post services should not be called
  expect(global.window.navigator.sendBeacon).toBeCalledTimes(0);
  expect(fakeSplitApi.postTestImpressionsBulk).not.toBeCalled();
  expect(fakeSplitApi.postEventsBulk).not.toBeCalled();
  expect(fakeSplitApi.postTestImpressionsCount).not.toBeCalled();

  // pre-check and call stop
  expect(global.window.removeEventListener).not.toBeCalled();
  listener.stop();

  // removed correct listener from correct signal on stop.
  expect((global.window.removeEventListener as jest.Mock).mock.calls).toEqual(eventListeners);
});

test('Browser JS listener / standalone mode / Impressions optimized mode with telemetry', () => {
  const syncManagerMock = {};

  // @ts-expect-error
  const listener = new BrowserSignalListener(syncManagerMock, fullSettings, fakeStorageOptimized as IStorageSync, fakeSplitApi);

  listener.start();

  // Assigned right function to right signal.
  const eventListeners = [[VISIBILITYCHANGE_EVENT, listener.flushDataIfHidden], [PAGEHIDE_EVENT, listener.flushData], [UNLOAD_DOM_EVENT, listener.stopSync]];
  expect((global.window.addEventListener as jest.Mock).mock.calls).toEqual(eventListeners);

  triggerEvent(VISIBILITYCHANGE_EVENT, 'hidden');

  // Visibility change event was triggered. Thus sendBeacon method should be called four times.
  expect(global.window.navigator.sendBeacon).toBeCalledTimes(4);

  // Http post services should have not been called
  expect(fakeSplitApi.postTestImpressionsBulk).not.toBeCalled();
  expect(fakeSplitApi.postEventsBulk).not.toBeCalled();
  expect(fakeSplitApi.postTestImpressionsCount).not.toBeCalled();

  // pre-check and call stop
  expect(global.window.removeEventListener).not.toBeCalled();
  listener.stop();

  // removed correct listener from correct signal on stop.
  expect((global.window.removeEventListener as jest.Mock).mock.calls).toEqual(eventListeners);
});

test('Browser JS listener / standalone mode / Impressions debug mode', () => {
  const syncManagerMockWithPushManager = { pushManager: { stop: jest.fn() } };

  // @ts-expect-error
  const listener = new BrowserSignalListener(syncManagerMockWithPushManager, fullSettings, fakeStorageDebug as IStorageSync, fakeSplitApi);

  listener.start();

  // Assigned right function to right signal.
  const eventListeners = [[VISIBILITYCHANGE_EVENT, listener.flushDataIfHidden], [PAGEHIDE_EVENT, listener.flushData], [UNLOAD_DOM_EVENT, listener.stopSync]];
  expect((global.window.addEventListener as jest.Mock).mock.calls).toEqual(eventListeners);

  triggerEvent(VISIBILITYCHANGE_EVENT, 'visible');

  // If visibility changes to visible, do nothing
  expect(syncManagerMockWithPushManager.pushManager.stop).not.toBeCalled();
  expect(global.window.navigator.sendBeacon).not.toBeCalled();

  triggerEvent(PAGEHIDE_EVENT);

  // Pagehide event was triggered. Thus sendBeacon method should be called twice.
  expect(global.window.navigator.sendBeacon).toBeCalledTimes(2);
  expect(syncManagerMockWithPushManager.pushManager.stop).not.toBeCalled();

  triggerEvent(UNLOAD_DOM_EVENT);

  // Unload event was triggered and pushManager is defined, so it must be stopped.
  expect(syncManagerMockWithPushManager.pushManager.stop).toBeCalledTimes(1);
  expect(global.window.navigator.sendBeacon).toBeCalledTimes(2);

  // Http post services should have not been called
  expect(fakeSplitApi.postTestImpressionsBulk).not.toBeCalled();
  expect(fakeSplitApi.postEventsBulk).not.toBeCalled();
  expect(fakeSplitApi.postTestImpressionsCount).not.toBeCalled();

  // pre-check and call stop
  expect(global.window.removeEventListener).not.toBeCalled();
  listener.stop();

  // removed correct listener from correct signal on stop.
  expect((global.window.removeEventListener as jest.Mock).mock.calls).toEqual(eventListeners);
});

test('Browser JS listener / standalone mode / Impressions debug mode without sendBeacon API', () => {
  // remove sendBeacon API temporally
  const sendBeacon = global.navigator.sendBeacon; // @ts-expect-error
  global.navigator.sendBeacon = undefined;
  const syncManagerMockWithoutPushManager = {};

  // @ts-expect-error
  const listener = new BrowserSignalListener(syncManagerMockWithoutPushManager, fullSettings, fakeStorageDebug as IStorageSync, fakeSplitApi);

  listener.start();

  // Assigned right function to right signal.
  const eventListeners = [[VISIBILITYCHANGE_EVENT, listener.flushDataIfHidden], [PAGEHIDE_EVENT, listener.flushData], [UNLOAD_DOM_EVENT, listener.stopSync]];
  expect((global.window.addEventListener as jest.Mock).mock.calls).toEqual(eventListeners);

  triggerEvent(VISIBILITYCHANGE_EVENT, 'hidden');

  // Visibility has changed to hidden and sendBeacon API is not available, so http post services should be called
  expect(sendBeacon).not.toBeCalled();
  expect(fakeSplitApi.postTestImpressionsBulk).toBeCalledTimes(1);
  expect(fakeSplitApi.postEventsBulk).toBeCalledTimes(1);
  expect(fakeSplitApi.postTestImpressionsCount).not.toBeCalled();

  // pre-check and call stop
  expect(global.window.removeEventListener).not.toBeCalled();
  listener.stop();

  // removed correct listener from correct signal on stop.
  expect((global.window.removeEventListener as jest.Mock).mock.calls).toEqual(eventListeners);

  // restore sendBeacon API
  global.navigator.sendBeacon = sendBeacon;
});

test('Browser JS listener / standalone mode / user consent status', () => {
  const syncManagerMock = {};
  const settings = { ...fullSettings };

  // @ts-expect-error
  const listener = new BrowserSignalListener(syncManagerMock, settings, fakeStorageOptimized as IStorageSync, fakeSplitApi);

  listener.start();

  settings.userConsent = 'UNKNOWN';
  triggerEvent(PAGEHIDE_EVENT);
  settings.userConsent = 'DECLINED';
  triggerEvent(VISIBILITYCHANGE_EVENT, 'hidden');

  // Unload event was triggered when user consent was unknown and declined. Thus sendBeacon and post services should be called only for telemetry
  expect(global.window.navigator.sendBeacon).toBeCalledTimes(2);
  expect(fakeSplitApi.postTestImpressionsBulk).not.toBeCalled();
  expect(fakeSplitApi.postEventsBulk).not.toBeCalled();
  expect(fakeSplitApi.postTestImpressionsCount).not.toBeCalled();
  (global.window.navigator.sendBeacon as jest.Mock).mockClear();

  settings.userConsent = 'GRANTED';
  triggerEvent(PAGEHIDE_EVENT);
  settings.userConsent = undefined;
  triggerEvent(VISIBILITYCHANGE_EVENT, 'hidden');

  // Unload event was triggered when user consent was granted and undefined. Thus sendBeacon should be called 8 times (4 times per event in optimized mode with telemetry).
  expect(global.window.navigator.sendBeacon).toBeCalledTimes(8);

  listener.stop();
});
