import * as c from '../constants';

export const codesError: [number, string][] = [
  // evaluator
  [c.ERROR_ENGINE_COMBINER_IFELSEIF, c.LOG_PREFIX_ENGINE_COMBINER + 'Invalid feature flag, no valid rules found'],
  // SDK
  [c.ERROR_LOGLEVEL_INVALID, 'logger: Invalid Log Level - No changes to the logs will be applied.'],
  [c.ERROR_CLIENT_CANNOT_GET_READY, 'The SDK will not get ready. Reason: %s'],
  [c.ERROR_IMPRESSIONS_TRACKER, c.LOG_PREFIX_IMPRESSIONS_TRACKER + 'Could not store impressions bulk with %s impression(s). Error: %s'],
  [c.ERROR_IMPRESSIONS_LISTENER, c.LOG_PREFIX_IMPRESSIONS_TRACKER + 'Impression listener logImpression method threw: %s.'],
  [c.ERROR_EVENTS_TRACKER, c.LOG_PREFIX_EVENTS_TRACKER + 'Failed to queue %s'],
  // synchronizer
  [c.ERROR_SYNC_OFFLINE_LOADING, c.LOG_PREFIX_SYNC_OFFLINE + 'There was an issue loading the mock feature flags data. No changes will be applied to the current cache. %s'],
  [c.ERROR_STREAMING_SSE, c.LOG_PREFIX_SYNC_STREAMING + 'Failed to connect or error on streaming connection, with error message: %s'],
  [c.ERROR_STREAMING_AUTH, c.LOG_PREFIX_SYNC_STREAMING + 'Failed to authenticate for streaming. Error: %s.'],
  [c.ERROR_HTTP, 'Response status is not OK. Status: %s. URL: %s. Message: %s'],
  // client status
  [c.ERROR_CLIENT_LISTENER, 'A listener was added for %s on the SDK, which has already fired and won\'t be emitted again. The callback won\'t be executed.'],
  [c.ERROR_CLIENT_DESTROYED, '%s: Client has already been destroyed - no calls possible.'],
  // input validation
  [c.ERROR_EVENT_TYPE_FORMAT, '%s: you passed "%s", event_type must adhere to the regular expression /^[a-zA-Z0-9][-_.:a-zA-Z0-9]{0,79}$/g. This means an event_type must be alphanumeric, cannot be more than 80 characters long, and can only include a dash, underscore, period, or colon as separators of alphanumeric characters.'],
  [c.ERROR_NOT_PLAIN_OBJECT, '%s: %s must be a plain object.'],
  [c.ERROR_SIZE_EXCEEDED, '%s: the maximum size allowed for the properties is 32768 bytes, which was exceeded. Event not queued.'],
  [c.ERROR_NOT_FINITE, '%s: value must be a finite number.'],
  [c.ERROR_NULL, '%s: you passed a null or undefined %s. It must be a non-empty string.'],
  [c.ERROR_TOO_LONG, '%s: %s too long. It must have 250 characters or less.'],
  [c.ERROR_INVALID_KEY_OBJECT, '%s: Key must be an object with bucketingKey and matchingKey with valid string properties.'],
  [c.ERROR_INVALID, '%s: you passed an invalid %s. It must be a non-empty string.'],
  [c.ERROR_EMPTY, '%s: you passed an empty %s. It must be a non-empty string.'],
  [c.ERROR_EMPTY_ARRAY, '%s: %s must be a non-empty array.'],
  [c.ERROR_NOT_BOOLEAN, '%s: provided param must be a boolean value.'],
  // initialization / settings validation
  [c.ERROR_INVALID_CONFIG_PARAM, c.LOG_PREFIX_SETTINGS + ': you passed an invalid "%s" config param. It should be one of the following values: %s. Defaulting to "%s".'],
  [c.ERROR_LOCALHOST_MODULE_REQUIRED, c.LOG_PREFIX_SETTINGS + ': an invalid value was received for "sync.localhostMode" config. A valid entity should be provided for localhost mode.'],
  [c.ERROR_STORAGE_INVALID, c.LOG_PREFIX_SETTINGS+': the provided storage is invalid.%s Falling back into default MEMORY storage'],
  [c.ERROR_MIN_CONFIG_PARAM, c.LOG_PREFIX_SETTINGS + ': the provided "%s" config param is lower than allowed. Setting to the minimum value %s seconds'],
];
