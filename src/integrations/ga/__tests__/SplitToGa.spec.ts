import { SplitIO } from '../../../types';
import { SPLIT_IMPRESSION, SPLIT_EVENT } from '../../../utils/constants';

// Mocks
import { loggerMock, mockClear } from '../../../logger/__tests__/sdkLogger.mock';
import { gaMock, gaRemove } from './gaMock';

// Test target
import SplitToGa from '../SplitToGa';

const fakeImpressionPayload: SplitIO.ImpressionData = {
  impression: {
    feature: 'hierarchical_splits_test',
    keyName: 'nicolas@split.io',
    treatment: 'on',
    bucketingKey: undefined,
    label: 'expected label',
    time: 2000,
    changeNumber: 1000,
  },
  attributes: undefined,
  ip: 'ip',
  hostname: 'hostname',
  sdkLanguageVersion: 'version',
};
const fakeImpression: SplitIO.IntegrationData = {
  type: SPLIT_IMPRESSION,
  payload: fakeImpressionPayload,
};
const defaultImpressionFieldsObject: UniversalAnalytics.FieldsObject = {
  hitType: 'event',
  eventCategory: 'split-impression',
  eventAction: 'Evaluate ' + fakeImpressionPayload.impression.feature,
  eventLabel: 'Treatment: ' + fakeImpressionPayload.impression.treatment + '. Targeting rule: ' + fakeImpressionPayload.impression.label + '.',
  nonInteraction: true
};

const fakeEventPayload: SplitIO.EventData = {
  eventTypeId: 'eventTypeId',
  trafficTypeName: 'trafficTypeName',
  value: 0,
  timestamp: Date.now(),
  key: 'key',
  properties: {},
};
const fakeEvent: SplitIO.IntegrationData = {
  type: SPLIT_EVENT,
  payload: fakeEventPayload,
};
const defaultEventFieldsObject = {
  hitType: 'event',
  eventCategory: 'split-event',
  eventAction: fakeEventPayload.eventTypeId,
  eventValue: fakeEventPayload.value,
  nonInteraction: true
};

describe('SplitToGa', () => {

  test('SplitToGa.validateFieldsObject', () => {
    expect(SplitToGa.validateFieldsObject(undefined, loggerMock)).toBe(false);
    expect(SplitToGa.validateFieldsObject(null, loggerMock)).toBe(false);
    expect(SplitToGa.validateFieldsObject(123, loggerMock)).toBe(false);
    expect(SplitToGa.validateFieldsObject(true, loggerMock)).toBe(false);
    expect(SplitToGa.validateFieldsObject('something', loggerMock)).toBe(false);
    expect(SplitToGa.validateFieldsObject(/asd/ig, loggerMock)).toBe(false);
    expect(SplitToGa.validateFieldsObject(function () { }, loggerMock)).toBe(false);

    expect(SplitToGa.validateFieldsObject({}, loggerMock)).toBe(false); // An empty object is an invalid FieldsObject instance
    expect(SplitToGa.validateFieldsObject({ hitType: 10 }, loggerMock)).toBe(true); // A fields object instance must have a HitType
    expect(SplitToGa.validateFieldsObject({ hitType: 'event', ignoredProp: 'ignoredProp' }, loggerMock)).toBe(true); // A fields object instance must have a HitType
  });

  test('SplitToGa.defaultMapper', () => {
    // should return the corresponding FieldsObject for a given impression
    expect(SplitToGa.defaultMapper(fakeImpression)).toEqual(defaultImpressionFieldsObject);
    // should return the corresponding FieldsObject for a given event
    expect(SplitToGa.defaultMapper(fakeEvent)).toEqual(defaultEventFieldsObject);
  });

  test('SplitToGa.getGa', () => {
    mockClear();

    const { ga } = gaMock();
    expect(SplitToGa.getGa()).toBe(ga); // should return ga command queue if it exists

    let integration = new SplitToGa({}, loggerMock);
    expect(typeof integration).toBe('object');
    expect(loggerMock.warn.mock.calls.length).toBe(0);

    gaRemove();
    expect(SplitToGa.getGa()).toBe(undefined); // should return undefined if ga command queue does not exist

    integration = new SplitToGa({}, loggerMock);
    expect(typeof integration).toBe('object'); // SplitToGa instances should be created even if ga command queue does not exist
    // @ts-expect-error
    integration.queue('fake-data');
    expect(loggerMock.warn.mock.calls).toEqual([ // Warn when creating and queueing while ga command queue does not exist
      ['`ga` command queue not found. No hits will be sent until it is available.'],
      ['`ga` command queue not found. No hit was sent.']
    ]);
  });

  test('SplitToGa (constructor and queue method)', () => {

    // test setup
    const { ga } = gaMock();

    /** Default behaviour **/
    const instance = new SplitToGa({}, loggerMock) as SplitToGa;
    instance.queue(fakeImpression);
    // should queue `ga send` with the default mapped FieldsObject for impressions, appended with `splitHit` field
    expect(ga.mock.calls[ga.mock.calls.length - 1]).toEqual(['send', { ...defaultImpressionFieldsObject, splitHit: true }]);

    instance.queue(fakeEvent);
    // should queue `ga send` with the default mapped FieldsObject for events, appended with `splitHit` field
    expect(ga.mock.calls[ga.mock.calls.length - 1]).toEqual(['send', { ...defaultEventFieldsObject, splitHit: true }]);

    expect(ga.mock.calls.length).toBe(2);

    /** Custom behaviour **/
    // Custom filter
    function customFilter(data: SplitIO.IntegrationData) {
      return data.type === SPLIT_EVENT;
    }
    // Custom mapper that returns a new FieldsObject instance
    function customMapper() {
      return {
        hitType: 'event',
        someField: 'someField',
      } as UniversalAnalytics.FieldsObject;
    }
    const trackerNames = ['', 'namedTracker'];
    const instance2 = new SplitToGa({
      filter: customFilter,
      mapper: customMapper,
      trackerNames,
    }, loggerMock) as SplitToGa;
    ga.mockClear();
    instance2.queue(fakeImpression);
    expect(ga.mock.calls.length === 0).toBe(true); // t queue `ga send` if a Split data (impression or event) is filtered

    instance2.queue(fakeEvent);
    expect(ga.mock.calls).toEqual([
      ['send', { ...customMapper(), splitHit: true }],
      [`${trackerNames[1]}.send`, { ...customMapper(), splitHit: true }]
    ]); // should queue `ga send` with the custom trackerName and FieldsObject from customMapper, appended with `splitHit` field

    expect(ga.mock.calls.length).toBe(2);

    // Custom mapper that returns the default FieldsObject
    function customMapper2(data: SplitIO.IntegrationData, defaultFieldsObject: UniversalAnalytics.FieldsObject) {
      return defaultFieldsObject;
    }
    const instance3 = new SplitToGa({
      mapper: customMapper2,
    }, loggerMock) as SplitToGa;
    ga.mockClear();
    instance3.queue(fakeImpression);
    // should queue `ga send` with the custom FieldsObject from customMapper2, appended with `splitHit` field
    expect(ga.mock.calls[ga.mock.calls.length - 1]).toEqual(['send', { ...customMapper2(fakeImpression, defaultImpressionFieldsObject), splitHit: true }]);

    expect(ga.mock.calls.length).toBe(1);

    // Custom mapper that throws an error
    function customMapper3() {
      throw 'some error';
    }
    const instance4 = new SplitToGa({ // @ts-expect-error
      mapper: customMapper3,
    }, loggerMock) as SplitToGa;
    ga.mockClear();
    instance4.queue(fakeImpression);
    expect(ga.mock.calls.length === 0).toBe(true); // t queue `ga send` if a custom mapper throw an exception

    // `impressions` flags
    const instance5 = new SplitToGa({
      impressions: false,
    }, loggerMock) as SplitToGa;
    ga.mockClear();
    instance5.queue(fakeImpression);
    expect(ga.mock.calls.length === 0).toBe(true); // t queue `ga send` for an impression if `impressions` flag is false

    // `impressions` flags
    const instance6 = new SplitToGa({
      events: false,
    }, loggerMock) as SplitToGa;
    ga.mockClear();
    instance6.queue(fakeEvent);
    expect(ga.mock.calls.length === 0).toBe(true); // t queue `ga send` for a event if `events` flag is false

    // test teardown
    gaRemove();
  });
});
