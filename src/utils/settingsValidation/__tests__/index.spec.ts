import _ from 'lodash';
import { ISettings } from '../../../types';
import { OPTIMIZED, DEBUG } from '../../constants';

// Test targets:
import { settingsValidation } from '../index';
import { url } from '../url';

const minimalSettingsParams = {
  // based on browser defaults
  defaults: {
    startup: {
      requestTimeoutBeforeReady: 5,
      retriesOnFailureBeforeReady: 1,
      readyTimeout: 10,
      eventsFirstPushWindow: 10
    },
    version: 'javascript-test',
  },
  runtime: () => ({ ip: false, hostname: false } as ISettings['runtime'])
};

describe('settingsValidation', () => {

  test('check defaults', () => {
    const settings = settingsValidation({
      core: {
        authorizationKey: 'dummy token'
      }
    }, minimalSettingsParams);

    expect(settings.urls).toEqual({
      sdk: 'https://sdk.split.io/api',
      events: 'https://events.split.io/api',
      auth: 'https://auth.split.io/api',
      streaming: 'https://streaming.split.io',
    });
    expect(settings.sync.impressionsMode).toBe(OPTIMIZED);
  });

  test('override with defaults', () => {
    const settings = settingsValidation({
      core: {
        authorizationKey: 'dummy token'
      },
      sync: {
        impressionsMode: 'some',
      }
    }, minimalSettingsParams);

    expect(settings.sync.impressionsMode).toBe(OPTIMIZED);
  });

  test('impressionsMode should be configurable', () => {
    const settings = settingsValidation({
      core: {
        authorizationKey: 'dummy token'
      },
      sync: {
        impressionsMode: DEBUG
      }
    }, minimalSettingsParams);

    expect(settings.sync.impressionsMode).toEqual(DEBUG);
  });

  test('urls should be configurable', () => {
    const urls = {
      sdk: 'sdk-url',
      events: 'events-url',
      auth: 'auth-url',
      streaming: 'streaming-url',
    };

    const settings = settingsValidation({
      core: {
        authorizationKey: 'dummy token'
      },
      urls
    }, minimalSettingsParams);

    expect(settings.urls).toEqual(urls);
  });

  test('required properties should be always present', () => {
    const locatorAuthorizationKey = _.property('core.authorizationKey');

    const locatorSchedulerFeaturesRefreshRate = _.property('scheduler.featuresRefreshRate');
    const locatorSchedulerSegmentsRefreshRate = _.property('scheduler.segmentsRefreshRate');
    const locatorSchedulerMetricsRefreshRate = _.property('scheduler.metricsRefreshRate');
    const locatorSchedulerImpressionsRefreshRate = _.property('scheduler.impressionsRefreshRate');

    const locatorUrlsSDK = _.property('urls.sdk');
    const locatorUrlsEvents = _.property('urls.events');

    const locatorStartupRequestTimeoutBeforeReady = _.property('startup.requestTimeoutBeforeReady');
    const locatorStartupRetriesOnFailureBeforeReady = _.property('startup.retriesOnFailureBeforeReady');
    const locatorStartupReadyTimeout = _.property('startup.readyTimeout');

    const settings = settingsValidation({
      core: {
        authorizationKey: 'dummy token'
      },
      scheduler: {
        featuresRefreshRate: undefined,
        segmentsRefreshRate: undefined,
        metricsRefreshRate: undefined,
        impressionsRefreshRate: undefined
      },
      urls: {
        sdk: undefined,
        events: undefined
      },
      startup: {
        requestTimeoutBeforeReady: undefined,
        retriesOnFailureBeforeReady: undefined,
        readyTimeout: undefined
      }
    }, minimalSettingsParams);

    expect(locatorAuthorizationKey(settings) !== undefined).toBe(true); // authorizationKey should be present

    expect(locatorSchedulerFeaturesRefreshRate(settings) !== undefined).toBe(true); // scheduler.featuresRefreshRate should be present
    expect(locatorSchedulerSegmentsRefreshRate(settings) !== undefined).toBe(true); // scheduler.segmentsRefreshRate should be present
    expect(locatorSchedulerMetricsRefreshRate(settings)).toBe(120 * 1000); // scheduler.metricsRefreshRate should be present
    expect(locatorSchedulerImpressionsRefreshRate(settings) !== undefined).toBe(true); // scheduler.impressionsRefreshRate should be present

    expect(locatorUrlsSDK(settings) !== undefined).toBe(true); // urls.sdk should be present
    expect(locatorUrlsEvents(settings) !== undefined).toBe(true); // urls.events should be present

    expect(locatorStartupRequestTimeoutBeforeReady(settings) !== undefined).toBe(true); // startup.requestTimeoutBeforeReady should be present
    expect(locatorStartupRetriesOnFailureBeforeReady(settings) !== undefined).toBe(true); // startup.retriesOnFailureBeforeReady should be present
    expect(locatorStartupReadyTimeout(settings) !== undefined).toBe(true); // startup.readyTimeout should be present
  });

  test('streamingEnabled should be overwritable and true by default', () => {
    const settingsWithStreamingDisabled = settingsValidation({
      core: {
        authorizationKey: 'dummy token',
      },
      streamingEnabled: false
    }, minimalSettingsParams);
    const settingsWithStreamingEnabled = settingsValidation({
      core: {
        authorizationKey: 'dummy token'
      }
    }, minimalSettingsParams);

    expect(settingsWithStreamingDisabled.streamingEnabled).toBe(false); // When creating a setting instance, it will have the provided value for streamingEnabled
    expect(settingsWithStreamingEnabled.streamingEnabled).toBe(true); // If streamingEnabled is not provided, it will be true.
  });

  const storageMock = () => { };
  const integrationsMock = [() => { }];

  test('overwrites storage with the result of the given storage validator', () => {
    const storageValidatorResult = () => { };
    const storageValidatorMock = jest.fn(() => storageValidatorResult);
    const settings = settingsValidation({
      core: {
        authorizationKey: 'dummy token'
      },
      storage: storageMock,
      integrations: integrationsMock
      // @ts-ignore
    }, { ...minimalSettingsParams, storage: storageValidatorMock });

    expect(settings.integrations).toBe(integrationsMock);
    expect(settings.storage).toBe(storageValidatorResult);
    expect(storageValidatorMock).toBeCalledWith(settings);
  });

  test('overwrites integrations with the result of the given integrations validator', () => {
    const integrationsValidatorResult = () => { };
    const integrationsValidatorMock = jest.fn(() => integrationsValidatorResult);
    const settings = settingsValidation({
      core: {
        authorizationKey: 'dummy token'
      },
      storage: storageMock,
      integrations: integrationsMock
      // @ts-ignore
    }, { ...minimalSettingsParams, integrations: integrationsValidatorMock });

    expect(settings.storage).toBe(storageMock);
    expect(settings.integrations).toBe(integrationsValidatorResult);
    expect(integrationsValidatorMock).toBeCalledWith(settings);
  });
});

test('SETTINGS / urls should be correctly assigned', () => {
  const settings = settingsValidation({
    core: {
      authorizationKey: 'dummy token'
    }
  }, minimalSettingsParams);

  const baseSdkUrl = 'https://sdk.split.io/api';
  const baseEventsUrl = 'https://events.split.io/api';

  [
    '/mySegments/nico',
    '/mySegments/events@split',
    '/mySegments/metrics@split',
    '/mySegments/testImpressions@split',
    '/mySegments/testImpressions',
    '/mySegments/events',
    '/mySegments/metrics',
    '/splitChanges?since=-1',
    '/splitChanges?since=100',
    '/segmentChanges/segment1?since=100',
    '/segmentChanges/events?since=100',
    '/segmentChanges/beacon?since=100',
    '/segmentChanges/metrics?since=100',
    '/segmentChanges/testImpressions?since=100'
  ].forEach(relativeUrl => {
    expect(url(settings, relativeUrl)).toBe(`${baseSdkUrl}${relativeUrl}`); // Our settings URL function should use ${baseSdkUrl} as base for ${relativeUrl}
  });

  [
    '/metrics/times',
    '/metrics/counters',
    '/events/bulk',
    '/events/beacon',
    '/testImpressions/bulk',
    '/testImpressions/beacon',
    '/testImpressions/count/beacon'
  ].forEach(relativeUrl => {
    expect(url(settings, relativeUrl)).toBe(`${baseEventsUrl}${relativeUrl}`); // Our settings URL function should use ${baseEventsUrl} as base for ${relativeUrl}
  });
});
