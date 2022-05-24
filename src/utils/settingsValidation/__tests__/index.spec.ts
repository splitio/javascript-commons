import _ from 'lodash';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';
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
  runtime: () => ({ ip: false, hostname: false } as ISettings['runtime']),
  logger: () => (loggerMock as ISettings['log']),
  consent: () => undefined
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
      telemetry: 'https://telemetry.split.io/api',
    });
    expect(settings.sync.impressionsMode).toBe(OPTIMIZED);
  });

  test('override with default impressionMode if provided one is invalid', () => {
    const config = {
      core: { authorizationKey: 'dummy token' },
      sync: { impressionsMode: 'some' }
    };
    let settings = settingsValidation(config, minimalSettingsParams);

    expect(settings.sync.impressionsMode).toBe(OPTIMIZED);
    expect(settings.scheduler.impressionsRefreshRate).toBe(300000); // Default

    settings = settingsValidation({ ...config, scheduler: { impressionsRefreshRate: 10 } }, minimalSettingsParams);

    expect(settings.sync.impressionsMode).toBe(OPTIMIZED);
    expect(settings.scheduler.impressionsRefreshRate).toBe(10000);
  });

  test('impressionsMode should be configurable', () => {
    const config = {
      core: { authorizationKey: 'dummy token' },
      sync: { impressionsMode: DEBUG }
    };
    let settings = settingsValidation(config, minimalSettingsParams);

    expect(settings.sync.impressionsMode).toEqual(DEBUG);
    expect(settings.scheduler.impressionsRefreshRate).toBe(60000); // Different default for DEBUG impressionsMode

    settings = settingsValidation({ ...config, scheduler: { impressionsRefreshRate: 10 } }, minimalSettingsParams);

    expect(settings.sync.impressionsMode).toBe(OPTIMIZED);
    expect(settings.scheduler.impressionsRefreshRate).toBe(10000);
  });

  test('urls should be configurable', () => {
    const urls = {
      sdk: 'sdk-url',
      events: 'events-url',
      auth: 'auth-url',
      streaming: 'streaming-url',
      telemetry: 'telemetry-url',
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
    const locatorSchedulerTelemetryRefreshRate = _.property('scheduler.telemetryRefreshRate');
    const locatorSchedulerImpressionsRefreshRate = _.property('scheduler.impressionsRefreshRate');
    const locatorSchedulerEventsPushRate = _.property('scheduler.eventsPushRate');

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
    expect(locatorSchedulerTelemetryRefreshRate(settings)).toBe(3600 * 1000); // scheduler.telemetryRefreshRate should be present
    expect(locatorSchedulerImpressionsRefreshRate(settings) !== undefined).toBe(true); // scheduler.impressionsRefreshRate should be present
    expect(locatorSchedulerEventsPushRate(settings) !== undefined).toBe(true); // scheduler.eventsPushRate should be present

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

  test('validates and sanitizes key and traffic type in client-side', () => {
    const clientSideValidationParams = { ...minimalSettingsParams, acceptKey: true, acceptTT: true };

    const samples = [{
      key: '  valid-key  ', settingsKey: 'valid-key', // key string is trimmed
      trafficType: 'VALID-TT', settingsTrafficType: 'valid-tt', // TT is converted to lowercase
    }, {
      key: undefined, settingsKey: false, // undefined key is not valid in client-side
      trafficType: undefined, settingsTrafficType: undefined,
    }, {
      key: null, settingsKey: false,
      trafficType: null, settingsTrafficType: false,
    }, {
      key: true, settingsKey: false,
      trafficType: true, settingsTrafficType: false,
    }, {
      key: 1.5, settingsKey: '1.5', // finite number as key is parsed
      trafficType: 100, settingsTrafficType: false,
    }, {
      key: { matchingKey: 100, bucketingKey: ' BUCK ' }, settingsKey: { matchingKey: '100', bucketingKey: 'BUCK' },
      trafficType: {}, settingsTrafficType: false,
    }];

    samples.forEach(({ key, trafficType, settingsKey, settingsTrafficType }) => {
      const settings = settingsValidation({
        core: {
          authorizationKey: 'dummy token',
          key,
          trafficType
        }
      }, clientSideValidationParams);

      expect(settings.core.key).toEqual(settingsKey);
      expect(settings.core.trafficType).toEqual(settingsTrafficType);
    });
  });

  test('validates and sanitizes key, while traffic type is ignored', () => {
    const settings = settingsValidation({
      core: {
        authorizationKey: 'dummy token',
        key: true,
        trafficType: true
      }
    }, { ...minimalSettingsParams, acceptKey: true });

    expect(settings.core.key).toEqual(false); // key is validated
    expect(settings.core.trafficType).toEqual(true); // traffic type is ignored
  });

  // Not implemented yet
  // test('validate min values', () => {
  //   const settings = settingsValidation({
  //     scheduler: {
  //       telemetryRefreshRate: 0,
  //       impressionsRefreshRate: 'invalid',
  //     }
  //   }, minimalSettingsParams);

  //   expect(settings.scheduler.telemetryRefreshRate).toBe(60000);
  //   expect(settings.scheduler.impressionsRefreshRate).toBe(60000);
  // });

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
