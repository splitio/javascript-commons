/* eslint-disable no-undef */
import { IEventsCacheSync } from '../../../storages/types';
import { ISettings, EventData } from '../../../types';
import { GaToSplit, validateIdentities, defaultPrefix, defaultMapper, validateEventData, fixEventTypeId } from '../GaToSplit';
import { gaMock, gaRemove, modelMock } from './gaMock';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

const hitSample: UniversalAnalytics.FieldsObject = {
  hitType: 'pageview',
  page: '/path',
};
const modelSample = modelMock(hitSample);
const expectedDefaultEvent = {
  eventTypeId: 'pageview',
  value: undefined,
  properties: { page: hitSample.page },
  timestamp: 0,
};

test('validateIdentities', () => {
  expect(validateIdentities(undefined)).toEqual([]); // @ts-expect-error
  expect(validateIdentities(null)).toEqual([]); // @ts-expect-error
  expect(validateIdentities(123)).toEqual([]); // @ts-expect-error
  expect(validateIdentities(true)).toEqual([]); // @ts-expect-error
  expect(validateIdentities('something')).toEqual([]); // @ts-expect-error
  expect(validateIdentities({})).toEqual([]); // @ts-expect-error
  expect(validateIdentities(/asd/ig)).toEqual([]); // @ts-expect-error
  expect(validateIdentities(function () { })).toEqual([]);

  expect(validateIdentities([])).toEqual([]); // @ts-expect-error
  expect(validateIdentities([undefined, /asd/ig, function () { }])).toEqual([]);
  expect(validateIdentities([{
    key: 'key', trafficType: 'user' // First occurence of this item
  }, { // @ts-expect-error
    key: 'key', trafficType: function () { } // Invalid item (invalid TT)
  }, {
    key: 'keyu', trafficType: 'ser' // First occurence of this item
  }, { // @ts-expect-error
    key: true, trafficType: 'user' // Invalid item (invalid key)
  }, {
    key: 'key2', trafficType: 'user2' // First occurence of this item
  }, { // @ts-expect-error
    key: 12, trafficType: 'user' // First occurence of this item
  }, {
    key: 'key', trafficType: 'user' // Duplicated item
  }, // @ts-expect-error
  {} // Invalid item (undefined key and traffic type)
  ])).toEqual([{
    key: 'key', trafficType: 'user'
  }, {
    key: 'keyu', trafficType: 'ser'
  }, {
    key: 'key2', trafficType: 'user2'
  }, {
    key: 12, trafficType: 'user'
  }]);
});

test('validateEventData', () => {
  expect(() => { validateEventData(loggerMock, undefined); }).toThrow(); // throws exception if passed object is undefined
  expect(() => { validateEventData(loggerMock, null); }).toThrow(); // throws exception if passed object is null

  expect(validateEventData(loggerMock, {})).toBe(false); // event must have a valid eventTypeId
  expect(validateEventData(loggerMock, { eventTypeId: 'type' })).toBe(true); // event must have a valid eventTypeId
  expect(validateEventData(loggerMock, { eventTypeId: 123 })).toBe(false); // event must have a valid eventTypeId

  expect(validateEventData(loggerMock, { eventTypeId: 'type', value: 'value' })).toBe(false); // event must have a valid value if present
  expect(validateEventData(loggerMock, { eventTypeId: 'type', value: 0 })).toBe(true); // event must have a valid value if present

  expect(validateEventData(loggerMock, { eventTypeId: 'type', properties: ['prop1'] })).toBe(false); // event must have valid properties if present
  expect(validateEventData(loggerMock, { eventTypeId: 'type', properties: { prop1: 'prop1' } })).toBe(true); // event must have valid properties if present

  expect(validateEventData(loggerMock, { eventTypeId: 'type', timestamp: true })).toBe(false); // event must have a valid timestamp if present
  expect(validateEventData(loggerMock, { eventTypeId: 'type', timestamp: Date.now() })).toBe(true); // event must have a valid timestamp if present

  expect(validateEventData(loggerMock, { eventTypeId: 'type', key: true })).toBe(false); // event must have a valid key if present
  expect(validateEventData(loggerMock, { eventTypeId: 'type', key: 'key' })).toBe(true); // event must have a valid key if present

  expect(validateEventData(loggerMock, { eventTypeId: 'type', trafficTypeName: true })).toBe(false); // event must have a valid trafficTypeName if present
  expect(validateEventData(loggerMock, { eventTypeId: 'type', trafficTypeName: 'tt' })).toBe(true); // event must have a valid trafficTypeName if present
});

test('fixEventTypeId', () => {
  expect(fixEventTypeId(loggerMock, undefined)).toBe(undefined);
  expect(fixEventTypeId(loggerMock, 111)).toBe(111);
  expect(fixEventTypeId(loggerMock, '')).toBe('');
  expect(fixEventTypeId(loggerMock, '()')).toBe('');
  expect(fixEventTypeId(loggerMock, '()+_')).toBe('');
  expect(fixEventTypeId(loggerMock, '  some   event ')).toBe('some_event_');
  expect(fixEventTypeId(loggerMock, '  -*- some  -.%^ event =+ ')).toBe('some_-._event_');
});

test('defaultMapper', () => {
  const initTimestamp = Date.now();
  const defaultEvent = defaultMapper(modelSample);

  expect(defaultEvent.eventTypeId).toBe(expectedDefaultEvent.eventTypeId); // should return the corresponding default event instance for a given pageview hit
  expect(defaultEvent.value).toBe(expectedDefaultEvent.value);
  expect(defaultEvent.properties).toEqual(expectedDefaultEvent.properties); // @ts-ignore
  expect(initTimestamp <= defaultEvent.timestamp && defaultEvent.timestamp <= Date.now()).toBe(true);
});

const coreSettings = {
  authorizationKey: 'apikey',
  key: 'key',
  trafficType: 'user',
} as ISettings['core'];
const fakeStorage = {
  // @ts-expect-error
  events: {
    track: jest.fn()
  } as IEventsCacheSync
};
const fakeParams = {
  storage: fakeStorage,
  settings: { core: coreSettings, log: loggerMock }
};

// Returns a new event by copying defaultEvent
function customMapper(model: UniversalAnalytics.Model, defaultEvent: EventData) {
  return { ...defaultEvent, properties: { ...defaultEvent.properties, someProp: 'someProp' } };
}
// Updates defaultEvent
function customMapper2(model: UniversalAnalytics.Model, defaultEvent: EventData) {
  // @ts-ignore. The defaultEvent has a property value, that might be empty depending on the hitType
  defaultEvent.properties['someProp2'] = 'someProp2';
  return defaultEvent;
}
// Updates defaultEvent adding a `key` and `TT`, to assert that `identities` plugin param is ignored.
function customMapper3(model: UniversalAnalytics.Model, defaultEvent: EventData) {
  defaultEvent.key = 'someKey';
  defaultEvent.trafficTypeName = 'someTT';
  return defaultEvent;
}
function customFilter() {
  return true;
}
const customIdentities = [{ key: 'key2', trafficType: 'tt2' }];

test('GaToSplit', () => {

  // test setup
  const { ga, tracker } = gaMock();

  // provide SplitTracker plugin
  GaToSplit({}, fakeParams as any);
  // @ts-expect-error
  let [arg1, arg2, SplitTracker] = ga.mock.calls.pop() as [string, string, any];
  expect([arg1, arg2]).toEqual(['provide', 'splitTracker']);
  expect(typeof SplitTracker === 'function').toBe(true);

  /** Default behavior */

  // init plugin on default tracker. equivalent to calling `ga('require', 'splitTracker')`
  new SplitTracker(tracker);

  // send hit and assert that it was properly tracked as a Split event
  window.ga('send', hitSample);
  let event = (fakeStorage.events.track as jest.Mock).mock.calls.pop()[0];
  expect(event).toEqual(
    {
      ...expectedDefaultEvent,
      eventTypeId: defaultPrefix + '.' + expectedDefaultEvent.eventTypeId,
      key: coreSettings.key,
      trafficTypeName: coreSettings.trafficType,
      timestamp: event.timestamp,
    }); // should track an event using the default mapper and key and traffic type from the SDK config

  /** Custom behavior: plugin options */

  // init plugin with custom options
  new SplitTracker(tracker, { mapper: customMapper, filter: customFilter, identities: customIdentities, prefix: '' });

  // send hit and assert that it was properly tracked as a Split event
  window.ga('send', hitSample);
  event = (fakeStorage.events.track as jest.Mock).mock.calls.pop()[0];
  expect(event).toEqual(
    {
      ...customMapper(modelSample, defaultMapper(modelSample)),
      key: customIdentities[0].key,
      trafficTypeName: customIdentities[0].trafficType,
      timestamp: event.timestamp,
    }); // should track an event using a custom mapper and identity from the plugin options

  /** Custom behavior: SDK options */

  // provide a new SplitTracker plugin with custom SDK options
  GaToSplit({
    mapper: customMapper2, filter: customFilter, identities: customIdentities, prefix: ''
  }, fakeParams as any);
  // @ts-expect-error
  [arg1, arg2, SplitTracker] = ga.mock.calls.pop();
  expect([arg1, arg2]).toEqual(['provide', 'splitTracker']);
  expect(typeof SplitTracker === 'function').toBe(true);

  // init plugin
  new SplitTracker(tracker);

  // send hit and assert that it was properly tracked as a Split event
  window.ga('send', hitSample);
  event = (fakeStorage.events.track as jest.Mock).mock.calls.pop()[0];
  expect(event).toEqual(
    {
      ...customMapper2(modelSample, defaultMapper(modelSample)),
      key: customIdentities[0].key,
      trafficTypeName: customIdentities[0].trafficType,
      timestamp: event.timestamp,
    }); // should track the event using a custom mapper and identity from the SDK options

  /** Custom behavior: SDK options, including a customMapper that set events key and traffic type */

  // provide a new SplitTracker plugin with custom SDK options
  GaToSplit({
    mapper: customMapper3, filter: customFilter, identities: customIdentities, prefix: ''
  }, fakeParams as any);
  // @ts-ignore
  [arg1, arg2, SplitTracker] = ga.mock.calls.pop();
  expect([arg1, arg2]).toEqual(['provide', 'splitTracker']);
  expect(typeof SplitTracker === 'function').toBe(true);

  // init plugin
  new SplitTracker(tracker);

  // send hit and assert that it was properly tracked as a Split event
  window.ga('send', hitSample);
  event = (fakeStorage.events.track as jest.Mock).mock.calls.pop()[0];
  expect(event).toEqual(
    {
      ...customMapper3(modelSample, defaultMapper(modelSample)),
      timestamp: event.timestamp,
    }); // should track the event using a custom mapper and identity from the SDK options

  // test teardown
  gaRemove();
});

test('GaToSplit: `hits` flag param', () => {

  // test setup
  const { ga, tracker } = gaMock();
  GaToSplit({}, fakeParams as any); // @ts-expect-error
  let SplitTracker: any = ga.mock.calls.pop()[2];

  // init plugin with custom options
  new SplitTracker(tracker, { hits: false });

  // send hit and assert that it was not tracked as a Split event
  (fakeStorage.events.track as jest.Mock).mockClear();
  window.ga('send', hitSample);
  expect(fakeStorage.events.track).toBeCalledTimes(0);

  // test teardown
  gaRemove();
});

test('GaToSplit: `autoRequire` script and flag param', () => {
  // test setup
  gaMock();
  loggerMock.error.mockClear();

  // Create commands before autoRequire script is executed
  window.ga('create', 'UA-ID-X', 'auto', 'tX');

  GaToSplit({ autoRequire: true }, fakeParams as any);
  expect(loggerMock.error).toBeCalledTimes(1);

  window.ga('create', 'UA-ID-Y', 'auto', 'tY');

  // Run autoRequire iife
  require('../autoRequire.js');

  GaToSplit({ autoRequire: true }, fakeParams as any);
  expect(loggerMock.error).toBeCalledTimes(1);

  // Assert auto-require script
  window.ga('create', 'UA-ID-0');
  window.ga('create', 'UA-ID-1', 'auto', 't1');
  window.ga('create', 'UA-ID-2', { name: 't2' });
  window.ga('create', 'UA-ID-3', 'auto', { name: 't3' });
  window.ga('create', { trackingId: 'UA-ID-4', name: 't4' });

  expect(window.ga.q.map(args => args[0])).toEqual([
    'create' /* tX */, 'provide',
    'create' /* tY */, 'tX.require',
    'tY.require', 'provide',
    'create' /* default */, 'require',
    'create' /* t1 */, 't1.require',
    'create' /* t2 */, 't2.require',
    'create' /* t3 */, 't3.require',
    'create' /* t4 */, 't4.require',
  ]);

  // test teardown
  gaRemove();
});
