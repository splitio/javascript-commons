import BrowserSignalListener from '../browser';
import { IEventsCacheSync, IImpressionCountsCacheSync, IImpressionsCacheSync, IStorageSync } from '../../storages/types';
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

const fakeStorageOptimized = { // @ts-expect-error
  impressions: {
    isEmpty: jest.fn(),
    clear: jest.fn(),
    state() {
      return [fakeImpression];
    }
  } as IImpressionsCacheSync, // @ts-expect-error
  events: {
    isEmpty: jest.fn(),
    clear: jest.fn(),
    state() {
      return [fakeEvent];
    }
  } as IEventsCacheSync, // @ts-expect-error
  impressionCounts: {
    isEmpty: jest.fn(),
    clear: jest.fn(),
    state() {
      return fakeImpressionCounts;
    }
  } as IImpressionCountsCacheSync,
};

const fakeStorageDebug = {
  impressions: fakeStorageOptimized.impressions,
  events: fakeStorageOptimized.events
};

// @ts-expect-error
const fakeSplitApi = {
  postTestImpressionsBulk: jest.fn(() => Promise.resolve()),
  postEventsBulk: jest.fn(() => Promise.resolve()),
  postTestImpressionsCount: jest.fn(() => Promise.resolve())
} as ISplitApi;

const UNLOAD_DOM_EVENT = 'unload';
const unloadEventListeners = new Set<() => any>();

// mock window and navigator objects
beforeAll(() => {
  Object.defineProperty(global, 'window', {
    value: {
      addEventListener: jest.fn((event, cb) => {
        if (event === UNLOAD_DOM_EVENT) unloadEventListeners.add(cb);
      }),
      removeEventListener: jest.fn((event, cb) => {
        if (event === UNLOAD_DOM_EVENT) unloadEventListeners.delete(cb);
      }),
      navigator: {
        sendBeacon: jest.fn(() => true)
      }
    }
  });
  Object.defineProperty(global, 'navigator', {
    value: global.window.navigator
  });
});

// clean mocks
afterEach(() => {
  (global.window.addEventListener as jest.Mock).mockClear();
  (global.window.removeEventListener as jest.Mock).mockClear();
  if (global.window.navigator.sendBeacon) (global.window.navigator.sendBeacon as jest.Mock).mockClear();
});

// delete mocks from global
afterAll(() => {
  // @ts-expect-error
  delete global.window; // @ts-expect-error
  delete global.navigator;
});

function triggerUnloadEvent() {
  unloadEventListeners.forEach(cb => cb());
}

/* Mocks end */

test('Browser JS listener / Impressions optimized mode', (done) => {

  const listener = new BrowserSignalListener(undefined, fullSettings, fakeStorageOptimized as IStorageSync, fakeSplitApi);

  listener.start();

  // Assigned right function to right signal.
  expect((global.window.addEventListener as jest.Mock).mock.calls).toEqual([[UNLOAD_DOM_EVENT, listener.flushData]]);

  triggerUnloadEvent();

  setTimeout(() => {
    // Unload event was triggered. Thus sendBeacon method should have been called three times.
    expect(global.window.navigator.sendBeacon).toBeCalledTimes(3);

    // Http post services should have not been called
    expect(fakeSplitApi.postTestImpressionsBulk).not.toBeCalled();
    expect(fakeSplitApi.postEventsBulk).not.toBeCalled();
    expect(fakeSplitApi.postTestImpressionsCount).not.toBeCalled();

    // pre-check and call stop
    expect(global.window.removeEventListener).not.toBeCalled();
    listener.stop();

    // removed correct listener from correct signal on stop.
    expect((global.window.removeEventListener as jest.Mock).mock.calls).toEqual([[UNLOAD_DOM_EVENT, listener.flushData]]);

    done();
  }, 0);
});

test('Browser JS listener / Impressions debug mode', (done) => {

  const listener = new BrowserSignalListener(undefined, fullSettings, fakeStorageDebug as IStorageSync, fakeSplitApi);

  listener.start();

  // Assigned right function to right signal.
  expect((global.window.addEventListener as jest.Mock).mock.calls).toEqual([[UNLOAD_DOM_EVENT, listener.flushData]]);

  triggerUnloadEvent();

  setTimeout(() => {
    // Unload event was triggered. Thus sendBeacon method should have been called twice.
    expect(global.window.navigator.sendBeacon).toBeCalledTimes(2);

    // Http post services should have not been called
    expect(fakeSplitApi.postTestImpressionsBulk).not.toBeCalled();
    expect(fakeSplitApi.postEventsBulk).not.toBeCalled();
    expect(fakeSplitApi.postTestImpressionsCount).not.toBeCalled();

    // pre-check and call stop
    expect(global.window.removeEventListener).not.toBeCalled();
    listener.stop();

    // removed correct listener from correct signal on stop.
    expect((global.window.removeEventListener as jest.Mock).mock.calls).toEqual([[UNLOAD_DOM_EVENT, listener.flushData]]);

    done();
  }, 0);
});

test('Browser JS listener / Impressions debug mode without sendBeacon API', (done) => {
  // remove sendBeacon API
  const sendBeacon = global.navigator.sendBeacon; // @ts-expect-error
  global.navigator.sendBeacon = undefined;

  const listener = new BrowserSignalListener(undefined, fullSettings, fakeStorageDebug as IStorageSync, fakeSplitApi);

  listener.start();

  // Assigned right function to right signal.
  expect((global.window.addEventListener as jest.Mock).mock.calls).toEqual([[UNLOAD_DOM_EVENT, listener.flushData]]);

  triggerUnloadEvent();

  setTimeout(() => {
    // Unload event was triggered. Thus sendBeacon method should have been called twice.
    expect(sendBeacon).not.toBeCalled();

    // Http post services should have not been called
    expect(fakeSplitApi.postTestImpressionsBulk).toBeCalledTimes(1);
    expect(fakeSplitApi.postEventsBulk).toBeCalledTimes(1);
    expect(fakeSplitApi.postTestImpressionsCount).not.toBeCalled();

    // pre-check and call stop
    expect(global.window.removeEventListener).not.toBeCalled();
    listener.stop();

    // removed correct listener from correct signal on stop.
    expect((global.window.removeEventListener as jest.Mock).mock.calls).toEqual([[UNLOAD_DOM_EVENT, listener.flushData]]);

    // restore sendBeacon API
    global.navigator.sendBeacon = sendBeacon;

    done();
  }, 0);
});
