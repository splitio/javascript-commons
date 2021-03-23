import { WARN_ENGINE_INVALID_VALUE, WARN_ENGINE_NO_ATTRIBUTES, WARN_CLIENT_NO_LISTENER, WARN_4, WARN_5, WARN_6, WARN_7, WARN_8, WARN_9, WARN_10, WARN_11, WARN_SETTING_NULL, WARN_TRIMMING_PROPERTIES, WARN_CLIENT_NOT_READY, WARN_CONVERTING, WARN_TRIMMING, WARN_NOT_EXISTENT_SPLIT, WARN_LOWERCASE_TRAFFIC_TYPE, WARN_NOT_EXISTENT_TT, WARN_INTEGRATION_INVALID, WARN_SPLITS_FILTER_IGNORED, WARN_SPLITS_FILTER_INVALID, WARN_SPLITS_FILTER_EMPTY, WARN_STORAGE_INVALID, WARN_API_KEY, SETTINGS_LB, ENGINE_VALUE_LB, EVENTS_TRACKER_LB, SYNC_MYSEGMENTS_LB, SYNC_SPLITS_LB, SYNC_STREAMING_LB, SYNC_SUBMITTERS_LB } from '../constants';
import { codesError } from './error';

export const codesWarn: [number, string][] = codesError.concat([
  // evaluator
  [WARN_ENGINE_INVALID_VALUE, ENGINE_VALUE_LB + 'Value %s doesn\'t match with expected type.'],
  [WARN_ENGINE_NO_ATTRIBUTES, ENGINE_VALUE_LB + 'Defined attribute [%s], no attributes received.'],
  // synchronizer
  [WARN_4, SYNC_MYSEGMENTS_LB + 'Retrying download of segments #%s. Reason: %s'],
  [WARN_5, SYNC_SPLITS_LB + 'Error while doing fetch of Splits. %s'],
  [WARN_6, SYNC_STREAMING_LB + 'Error parsing SSE error notification: %s'],
  [WARN_7, SYNC_STREAMING_LB + 'Error parsing new SSE message notification: %s'],
  [WARN_8, SYNC_STREAMING_LB + 'Falling back to polling mode. Reason: %s'],
  [WARN_9, SYNC_SUBMITTERS_LB + 'Droping %s %s after retry. Reason: %s.'],
  [WARN_10, SYNC_SUBMITTERS_LB + 'Failed to push %s %s, keeping data to retry on next iteration. Reason: %s.'],
  // SDK
  [WARN_11, EVENTS_TRACKER_LB + 'Failed to queue %s'],
  // client status
  [WARN_CLIENT_NOT_READY, '%s: the SDK is not ready, results may be incorrect. Make sure to wait for SDK readiness before using this method.'],
  [WARN_CLIENT_NO_LISTENER, 'No listeners for SDK Readiness detected. Incorrect control treatments could have been logged if you called getTreatment/s while the SDK was not yet ready.'],
  // input validation
  [WARN_SETTING_NULL, '%s: Property "%s" is of invalid type. Setting value to null.'],
  [WARN_TRIMMING_PROPERTIES, '%s: Event has more than 300 properties. Some of them will be trimmed when processed.'],
  [WARN_CONVERTING, '%s: %s "%s" is not of type string, converting.'],
  [WARN_TRIMMING, '%s: %s "%s" has extra whitespace, trimming.'],
  [WARN_NOT_EXISTENT_SPLIT, '%s: split "%s" does not exist in this environment, please double check what splits exist in the web console.'],
  [WARN_LOWERCASE_TRAFFIC_TYPE, '%s: traffic_type_name should be all lowercase - converting string to lowercase.'],
  [WARN_NOT_EXISTENT_TT, '%s: traffic type "%s" does not have any corresponding split in this environment, make sure you\'re tracking your events to a valid traffic type defined in the web console.'],
  // initialization / settings validation
  [WARN_INTEGRATION_INVALID, SETTINGS_LB+': %s integration %s at settings %s invalid. %s'],
  [WARN_SPLITS_FILTER_IGNORED, SETTINGS_LB+': split filters have been configured but will have no effect if mode is not "%s", since synchronization is being deferred to an external tool.'],
  [WARN_SPLITS_FILTER_INVALID, SETTINGS_LB+': split filter at position %s is invalid. It must be an object with a valid filter type ("byName" or "byPrefix") and a list of "values".'],
  [WARN_SPLITS_FILTER_EMPTY, SETTINGS_LB+': splitFilters configuration must be a non-empty array of filter objects.'],
  [WARN_STORAGE_INVALID, SETTINGS_LB+': The provided storage is invalid. Fallbacking into default MEMORY storage'],
  [WARN_API_KEY, SETTINGS_LB+': You already have %s. We recommend keeping only one instance of the factory at all times (Singleton pattern) and reusing it throughout your application']
]);
