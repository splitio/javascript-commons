import { BrowserSignalListener } from '../browser';
import { ISplitApi } from '../../services/types';
import { fullSettings } from '../../utils/settingsValidation/__tests__/settings.mocks';

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
const fakeUniqueKeys = {
  keys: [{ k: 'emi', fs: ['split1'] }],
};

// Storage with impressionsCount and telemetry cache
const fakeStorageOptimized = {
  impressions: {
    isEmpty: jest.fn(),
    pop() {
      return [fakeImpression];
    }
  },
  events: {
    isEmpty: jest.fn(),
    pop() {
      return [fakeEvent];
    }
  },
  impressionCounts: {
    isEmpty: jest.fn(),
    pop() {
      return fakeImpressionCounts;
    }
  },
  uniqueKeys: {
    isEmpty: jest.fn(),
    pop() {
      return fakeUniqueKeys;
    }
  },
  telemetry: {
    isEmpty: jest.fn(),
    pop() {
      return 'fake telemetry';
    }
  }
};

const fakeStorageDebug = {
  impressions: fakeStorageOptimized.impressions,
  events: fakeStorageOptimized.events,
  impressionCounts: {
    isEmpty: jest.fn(() => true)
  },
  uniqueKeys: {
    isEmpty: jest.fn(() => true)
  }
};

// @ts-expect-error
const fakeSplitApi = {
  postTestImpressionsBulk: jest.fn(() => Promise.resolve()),
  postEventsBulk: jest.fn(() => Promise.resolve()),
  postTestImpressionsCount: jest.fn(() => Promise.resolve()),
  postMetricsUsage: jest.fn(() => Promise.resolve()),
  postUniqueKeysBulkCs: jest.fn(() => Promise.resolve()),
} as ISplitApi;

const VISIBILITYCHANGE_EVENT = 'visibilitychange';
const PAGEHIDE_EVENT = 'pagehide';

const eventListeners: any = {
  [VISIBILITYCHANGE_EVENT]: new Set<() => any>(),
  [PAGEHIDE_EVENT]: new Set<() => any>(),
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
        visibilityState: 'visible',
        addEventListener: jest.fn((event, cb) => {
          if (eventListeners[event]) eventListeners[event].add(cb);
        }),
        removeEventListener: jest.fn((event, cb) => {
          if (eventListeners[event]) eventListeners[event].delete(cb);
        }),
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
  (global.document.addEventListener as jest.Mock).mockClear();
  (global.document.removeEventListener as jest.Mock).mockClear();
  if (global.window.navigator.sendBeacon) (global.window.navigator.sendBeacon as jest.Mock).mockClear();
  Object.values(fakeSplitApi).forEach(method => method.mockClear()); // @ts-expect-error
  global.document.visibilityState = 'visible';
});

// delete mocks from global
afterAll(() => {
  // @ts-expect-error
  delete global.window; delete global.navigator; delete global.document;
});

function triggerEvent(event: string, visibilityState?: string) { // @ts-expect-error
  if (visibilityState) global.document.visibilityState = visibilityState;
  eventListeners[event].forEach((cb: () => any) => cb());
}

function assertStart(listener: BrowserSignalListener) {
  // Assigned right function to right signal.
  expect((global.document.addEventListener as jest.Mock).mock.calls).toEqual([[VISIBILITYCHANGE_EVENT, listener.flushDataIfHidden]]);
  expect((global.window.addEventListener as jest.Mock).mock.calls).toEqual([[PAGEHIDE_EVENT, listener.flushData]]);
}

function assertStop(listener: BrowserSignalListener) {
  // removed correct listener from correct signal on stop.
  expect((global.document.removeEventListener as jest.Mock).mock.calls).toEqual([[VISIBILITYCHANGE_EVENT, listener.flushDataIfHidden]]);
  expect((global.window.removeEventListener as jest.Mock).mock.calls).toEqual([[PAGEHIDE_EVENT, listener.flushData]]);
}

/* Mocks end */

test('Browser JS listener / consumer mode', () => {
  // No SyncManager ==> consumer mode
  // @ts-expect-error
  const listener = new BrowserSignalListener(undefined, fullSettings, fakeStorageOptimized, fakeSplitApi);

  listener.start();
  assertStart(listener);

  triggerEvent(VISIBILITYCHANGE_EVENT, 'hidden');
  triggerEvent(PAGEHIDE_EVENT);

  // Unload event was triggered, but sendBeacon and post services should not be called
  expect(global.window.navigator.sendBeacon).toBeCalledTimes(0);
  expect(fakeSplitApi.postTestImpressionsBulk).not.toBeCalled();
  expect(fakeSplitApi.postEventsBulk).not.toBeCalled();
  expect(fakeSplitApi.postTestImpressionsCount).not.toBeCalled();

  // pre-check and call stop
  expect(global.window.removeEventListener).not.toBeCalled();
  listener.stop();

  assertStop(listener);
});

test('Browser JS listener / standalone mode / Impressions optimized mode with telemetry', () => {
  const syncManagerMock = {};

  // @ts-expect-error
  const listener = new BrowserSignalListener(syncManagerMock, fullSettings, fakeStorageOptimized, fakeSplitApi);

  listener.start();
  assertStart(listener);

  triggerEvent(VISIBILITYCHANGE_EVENT, 'hidden');

  // Visibility change event was triggered. Thus sendBeacon method should be called five times (events, impressions, impression count, unique keys and telemetry).
  expect(global.window.navigator.sendBeacon).toBeCalledTimes(5);

  // Http post services should have not been called
  expect(fakeSplitApi.postTestImpressionsBulk).not.toBeCalled();
  expect(fakeSplitApi.postEventsBulk).not.toBeCalled();
  expect(fakeSplitApi.postTestImpressionsCount).not.toBeCalled();

  // pre-check and call stop
  expect(global.window.removeEventListener).not.toBeCalled();
  listener.stop();
  assertStop(listener);
});

test('Browser JS listener / standalone mode / Impressions debug mode', () => {
  const syncManagerMock = {};

  // @ts-expect-error
  const listener = new BrowserSignalListener(syncManagerMock, fullSettings, fakeStorageDebug, fakeSplitApi);

  listener.start();
  assertStart(listener);

  triggerEvent(VISIBILITYCHANGE_EVENT, 'visible');

  // If visibility changes to visible, do nothing
  expect(global.window.navigator.sendBeacon).not.toBeCalled();

  triggerEvent(PAGEHIDE_EVENT);

  // Pagehide event was triggered. Thus sendBeacon method should be called twice.
  expect(global.window.navigator.sendBeacon).toBeCalledTimes(2);

  // Http post services should have not been called
  expect(fakeSplitApi.postTestImpressionsBulk).not.toBeCalled();
  expect(fakeSplitApi.postEventsBulk).not.toBeCalled();
  expect(fakeSplitApi.postTestImpressionsCount).not.toBeCalled();

  // pre-check and call stop
  expect(global.window.removeEventListener).not.toBeCalled();
  listener.stop();
  assertStop(listener);
});

test('Browser JS listener / standalone mode / Fallback to regular Fetch transport', () => {

  function runBrowserListener() { // @ts-expect-error
    const listener = new BrowserSignalListener({}, fullSettings, fakeStorageDebug, fakeSplitApi);
    listener.start();
    // Trigger data flush
    triggerEvent(VISIBILITYCHANGE_EVENT, 'hidden');
    listener.stop();
  }

  // Case 1: sendBeacon API is not available
  const sendBeacon = global.navigator.sendBeacon; // @ts-expect-error
  global.navigator.sendBeacon = undefined;

  runBrowserListener();

  // Case 2: sendBeacon API returns false (i.e., it fails to queue the data for transfer)
  global.navigator.sendBeacon = () => false;

  runBrowserListener();

  // Case 3: sendBeacon API throws error
  global.navigator.sendBeacon = () => { throw new Error('sendBeacon error'); };

  runBrowserListener();

  // Assert that browser listener has fallen back to the regular Fetch transport when sendBeacon fails or is not available
  expect(fakeSplitApi.postTestImpressionsBulk).toBeCalledTimes(3);
  expect(fakeSplitApi.postEventsBulk).toBeCalledTimes(3);

  // restore sendBeacon API
  global.navigator.sendBeacon = sendBeacon;
});

test('Browser JS listener / standalone mode / user consent status', () => {
  const syncManagerMock = {};
  const settings = { ...fullSettings };

  // @ts-expect-error
  const listener = new BrowserSignalListener(syncManagerMock, settings, fakeStorageOptimized, fakeSplitApi);

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

  // Unload event was triggered when user consent was granted and undefined. Thus sendBeacon should be called 10 times (5 times per event).
  expect(global.window.navigator.sendBeacon).toBeCalledTimes(10);

  listener.stop();
});
