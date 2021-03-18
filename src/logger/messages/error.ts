import { ERROR_0, ERROR_2, ERROR_CLIENT_LISTENER, ERROR_4, ERROR_5, ERROR_7, ERROR_9, ERROR_10, ERROR_11, ERROR_12, ERROR_EVENT_TYPE_FORMAT, ERROR_NOT_PLAIN_OBJECT, ERROR_SIZE_EXCEEDED, ERROR_NOT_FINITE, ERROR_CLIENT_DESTROYED, ERROR_NULL, ERROR_TOO_LONG, ERROR_INVALID_KEY_OBJECT, ERROR_INVALID, ERROR_EMPTY, ERROR_EMPTY_ARRAY, ERROR_INVALID_IMPRESSIONS_MODE, ERROR_39, SETTINGS_LB, ENGINE_COMBINER_LB, SYNC_OFFLINE_LB, SYNC_STREAMING_LB, IMPRESSIONS_TRACKER_LB } from '../constants';

export const codesError: [number, string][] = [
  // evaluator
  [ERROR_0, ENGINE_COMBINER_LB + 'Invalid Split provided, no valid conditions found'],
  // SDK
  [ERROR_2, 'logger: Invalid Log Level - No changes to the logs will be applied.'],
  [ERROR_4, ' Manager instance is not available.'],
  [ERROR_5, ' The SDK will not get ready. Reason: %s'],
  // synchronizer
  [ERROR_7, SYNC_OFFLINE_LB + 'There was an issue loading the mock Splits data, no changes will be applied to the current cache. %s'],
  [ERROR_9, SYNC_STREAMING_LB + 'Fail to connect to streaming, with error message: %s'],
  [ERROR_10, SYNC_STREAMING_LB + 'Failed to authenticate for streaming. Error: "%s".'],
  [ERROR_11, IMPRESSIONS_TRACKER_LB + 'Could not store impressions bulk with %s impression%s. Error: %s'],
  [ERROR_12, IMPRESSIONS_TRACKER_LB + 'Impression listener logImpression method threw: %s.'],
  [ERROR_39, ' Response status is not OK. Status: %s. URL: %s. Message: %s'],
  // client status
  [ERROR_CLIENT_LISTENER, 'A listener was added for %s on the SDK, which has already fired and won\'t be emitted again. The callback won\'t be executed.'],
  [ERROR_CLIENT_DESTROYED, '%s: Client has already been destroyed - no calls possible.'],
  // input validation
  [ERROR_EVENT_TYPE_FORMAT, '%s: you passed "%s", event_type must adhere to the regular expression /^[a-zA-Z0-9][-_.:a-zA-Z0-9]{0,79}$/g. This means an event_type must be alphanumeric, cannot be more than 80 characters long, and can only include a dash, underscore, period, or colon as separators of alphanumeric characters.'],
  [ERROR_NOT_PLAIN_OBJECT, '%s: %s must be a plain object.'],
  [ERROR_SIZE_EXCEEDED, '%s: the maximum size allowed for the properties is 32768 bytes, which was exceeded. Event not queued.'],
  [ERROR_NOT_FINITE, '%s: value must be a finite number.'],
  [ERROR_NULL, '%s: you passed a null or undefined %s. It must be a non-empty string.'],
  [ERROR_TOO_LONG, '%s: %s too long. It must have 250 characters or less.'],
  [ERROR_INVALID_KEY_OBJECT, '%s: Key must be an object with bucketingKey and matchingKey with valid string properties.'],
  [ERROR_INVALID, '%s: you passed an invalid %s. It must be a non-empty string.'],
  [ERROR_EMPTY, '%s: you passed an empty %s. It must be a non-empty string.'],
  [ERROR_EMPTY_ARRAY, '%s: %s must be a non-empty array.'],
  // initialization / settings validation
  [ERROR_INVALID_IMPRESSIONS_MODE, SETTINGS_LB + ': you passed an invalid "impressionsMode". It should be one of the following values: %s. Defaulting to "%s" mode.'],
];
