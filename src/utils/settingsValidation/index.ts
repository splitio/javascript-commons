import { merge, get } from '../lang';
import { mode } from './mode';
import { validateSplitFilters } from './splitFilters';
import { STANDALONE_MODE, OPTIMIZED, LOCALHOST_MODE, DEBUG } from '../constants';
import { validImpressionsMode } from './impressionsMode';
import { ISettingsValidationParams } from './types';
import { ISettings } from '../../types';
import { validateKey } from '../inputValidation/key';
import { validateTrafficType } from '../inputValidation/trafficType';
import { ERROR_MIN_CONFIG_PARAM } from '../../logger/constants';

// Exported for telemetry
export const base = {
  // Define which kind of object you want to retrieve from SplitFactory
  mode: STANDALONE_MODE,

  core: {
    // API token (tight to an environment)
    authorizationKey: undefined,
    // key used in your system (only required for browser version)
    key: undefined,
    // traffic type for the given key (only used on browser version)
    trafficType: undefined,
    // toggle impressions tracking of labels
    labelsEnabled: true,
    // toggle sendind (true) or not sending (false) IP and Host Name with impressions, events, and telemetries requests (only used on nodejs version)
    IPAddressesEnabled: undefined
  },

  scheduler: {
    // fetch feature updates each 60 sec
    featuresRefreshRate: 60,
    // fetch segments updates each 60 sec
    segmentsRefreshRate: 60,
    // publish telemetry stats each 3600 secs (1 hour)
    telemetryRefreshRate: 3600,
    // publish evaluations each 300 sec (default value for OPTIMIZED impressions mode)
    impressionsRefreshRate: 300,
    // fetch offline changes each 15 sec
    offlineRefreshRate: 15,
    // publish events every 60 seconds after the first flush
    eventsPushRate: 60,
    // how many events will be queued before flushing
    eventsQueueSize: 500,
    // how many impressions will be queued before flushing
    impressionsQueueSize: 30000,
    // backoff base seconds to wait before re attempting to connect to push notifications
    pushRetryBackoffBase: 1,
  },

  urls: {
    // CDN having all the information for your environment
    sdk: 'https://sdk.split.io/api',
    // SDK event and impression endpoints
    events: 'https://events.split.io/api',
    // SDK Auth Server
    auth: 'https://auth.split.io/api',
    // Streaming Server
    streaming: 'https://streaming.split.io',
    // Telemetry Server
    telemetry: 'https://telemetry.split.io/api',
  },

  // Defines which kind of storage we should instanciate.
  storage: undefined,

  // Defines if the logs are enabled, SDK wide.
  debug: undefined,

  // Defines the impression listener, but will only be used on NodeJS.
  impressionListener: undefined,

  // Instance version.
  version: undefined,

  // List of integrations.
  integrations: undefined,

  // toggle using (true) or not using (false) Server-Side Events for synchronizing storage
  streamingEnabled: true,

  sync: {
    splitFilters: undefined,
    // impressions collection mode
    impressionsMode: OPTIMIZED,
    localhostMode: undefined,
    enabled: true
  },

  // Logger
  log: undefined
};

function fromSecondsToMillis(n: number) {
  return Math.round(n * 1000);
}

/**
 * Validates the given config and use it to build a settings object.
 * NOTE: it doesn't validate the SDK Key. Call `validateApiKey` or `validateAndTrackApiKey` for that after settings validation.
 *
 * @param config user defined configuration
 * @param validationParams defaults and fields validators used to validate and creates a settings object from a given config
 */
export function settingsValidation(config: unknown, validationParams: ISettingsValidationParams) {

  const { defaults, runtime, storage, integrations, logger, localhost, consent } = validationParams;

  // creates a settings object merging base, defaults and config objects.
  const withDefaults = merge({}, base, defaults, config) as ISettings;

  // ensure a valid logger.
  // First thing to validate, since other validators might use the logger.
  const log = logger(withDefaults); // @ts-ignore, modify readonly prop
  withDefaults.log = log;

  // ensure a valid impressionsMode
  withDefaults.sync.impressionsMode = validImpressionsMode(log, withDefaults.sync.impressionsMode);

  function validateMinValue(paramName: string, actualValue: number, minValue: number) {
    if (actualValue >= minValue) return actualValue;
    // actualValue is not a number or is lower than minValue
    log.error(ERROR_MIN_CONFIG_PARAM, [paramName, minValue]);
    return minValue;
  }

  // Scheduler periods
  const { scheduler, startup } = withDefaults;
  scheduler.featuresRefreshRate = fromSecondsToMillis(scheduler.featuresRefreshRate);
  scheduler.segmentsRefreshRate = fromSecondsToMillis(scheduler.segmentsRefreshRate);
  scheduler.offlineRefreshRate = fromSecondsToMillis(scheduler.offlineRefreshRate);
  scheduler.eventsPushRate = fromSecondsToMillis(scheduler.eventsPushRate);
  scheduler.telemetryRefreshRate = fromSecondsToMillis(validateMinValue('telemetryRefreshRate', scheduler.telemetryRefreshRate, 60));

  // Default impressionsRefreshRate for DEBUG mode is 60 secs
  if (get(config, 'scheduler.impressionsRefreshRate') === undefined && withDefaults.sync.impressionsMode === DEBUG) scheduler.impressionsRefreshRate = 60;
  scheduler.impressionsRefreshRate = fromSecondsToMillis(scheduler.impressionsRefreshRate);

  // Log deprecation for old telemetry param
  if (scheduler.metricsRefreshRate) log.warn('`metricsRefreshRate` will be deprecated soon. For configuring telemetry rates, update `telemetryRefreshRate` value in configs');

  // Startup periods
  startup.requestTimeoutBeforeReady = fromSecondsToMillis(startup.requestTimeoutBeforeReady);
  startup.readyTimeout = fromSecondsToMillis(startup.readyTimeout);
  startup.eventsFirstPushWindow = fromSecondsToMillis(startup.eventsFirstPushWindow);

  // ensure a valid SDK mode
  // @ts-ignore, modify readonly prop
  withDefaults.mode = mode(withDefaults.core.authorizationKey, withDefaults.mode);

  // ensure a valid Storage based on mode defined.
  // @ts-ignore, modify readonly prop
  if (storage) withDefaults.storage = storage(withDefaults);

  // Validate key and TT (for client-side)
  const maybeKey = withDefaults.core.key;
  if (validationParams.acceptKey) {
    // Although `key` is required in client-side, it can be omitted in LOCALHOST mode. In that case, the value `localhost_key` is used.
    if (withDefaults.mode === LOCALHOST_MODE && maybeKey === undefined) {
      withDefaults.core.key = 'localhost_key';
    } else {
      // Keeping same behaviour than JS SDK: if settings key or TT are invalid,
      // `false` value is used as binded key/TT of the default client, which leads to some issues.
      // @ts-ignore, @TODO handle invalid keys as a non-recoverable error?
      withDefaults.core.key = validateKey(log, maybeKey, 'Client instantiation');
    }

    if (validationParams.acceptTT) {
      const maybeTT = withDefaults.core.trafficType;
      if (maybeTT !== undefined) { // @ts-ignore
        withDefaults.core.trafficType = validateTrafficType(log, maybeTT, 'Client instantiation');
      }
    }
  } else {
    // On server-side, key is undefined and used to distinguish from client-side
    if (maybeKey !== undefined) log.warn('Provided `key` is ignored in server-side SDK.'); // @ts-ignore
    withDefaults.core.key = undefined;
  }

  // Current ip/hostname information
  // @ts-ignore, modify readonly prop
  withDefaults.runtime = runtime(withDefaults);

  // ensure a valid list of integrations.
  // `integrations` returns an array of valid integration items.
  // @ts-ignore, modify readonly prop
  if (integrations) withDefaults.integrations = integrations(withDefaults);

  if (localhost) withDefaults.sync.localhostMode = localhost(withDefaults);

  // validate push options
  if (withDefaults.streamingEnabled !== false) { // @ts-ignore, modify readonly prop
    withDefaults.streamingEnabled = true;
    // Backoff bases.
    // We are not checking if bases are positive numbers. Thus, we might be reauthenticating immediately (`setTimeout` with NaN or negative number)
    scheduler.pushRetryBackoffBase = fromSecondsToMillis(scheduler.pushRetryBackoffBase);
  }

  // validate sync enabled
  if (withDefaults.sync.enabled !== false) { // @ts-ignore, modify readonly prop
    withDefaults.sync.enabled = true;
  }

  // validate the `splitFilters` settings and parse splits query
  const splitFiltersValidation = validateSplitFilters(log, withDefaults.sync.splitFilters, withDefaults.mode);
  withDefaults.sync.splitFilters = splitFiltersValidation.validFilters;
  withDefaults.sync.__splitFiltersValidation = splitFiltersValidation;

  // ensure a valid user consent value
  // @ts-ignore, modify readonly prop
  withDefaults.userConsent = consent(withDefaults);

  return withDefaults;
}
