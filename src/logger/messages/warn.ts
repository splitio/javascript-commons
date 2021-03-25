import { ENGINE_VALUE_INVALID, ENGINE_VALUE_NO_ATTRIBUTES, CLIENT_NO_LISTENER, SYNC_MYSEGMENTS_FETCH_RETRY, SYNC_SPLITS_FETCH_FAILS, STREAMING_PARSING_ERROR_FAILS, STREAMING_PARSING_MESSAGE_FAILS, STREAMING_FALLBACK, SUBMITTERS_PUSH_FAILS, SUBMITTERS_PUSH_RETRY, ERROR_EVENTS_TRACKER, WARN_SETTING_NULL, WARN_TRIMMING_PROPERTIES, CLIENT_NOT_READY, WARN_CONVERTING, WARN_TRIMMING, WARN_NOT_EXISTENT_SPLIT, WARN_LOWERCASE_TRAFFIC_TYPE, WARN_NOT_EXISTENT_TT, WARN_INTEGRATION_INVALID, WARN_SPLITS_FILTER_IGNORED, WARN_SPLITS_FILTER_INVALID, WARN_SPLITS_FILTER_EMPTY, WARN_STORAGE_INVALID, WARN_API_KEY, logPrefixSettings, logPrefixEngineValue, logPrefixEventsTracker, logPrefixSyncMysegments, logPrefixSyncSplits, logPrefixSyncStreaming, logPrefixSyncSubmitters } from '../constants';
import { codesError } from './error';

export const codesWarn: [number, string][] = codesError.concat([
  // evaluator
  [ENGINE_VALUE_INVALID, logPrefixEngineValue + 'Value %s doesn\'t match with expected type.'],
  [ENGINE_VALUE_NO_ATTRIBUTES, logPrefixEngineValue + 'Defined attribute [%s], no attributes received.'],
  // synchronizer
  [SYNC_MYSEGMENTS_FETCH_RETRY, logPrefixSyncMysegments + 'Retrying download of segments #%s. Reason: %s'],
  [SYNC_SPLITS_FETCH_FAILS, logPrefixSyncSplits + 'Error while doing fetch of Splits. %s'],
  [STREAMING_PARSING_ERROR_FAILS, logPrefixSyncStreaming + 'Error parsing SSE error notification: %s'],
  [STREAMING_PARSING_MESSAGE_FAILS, logPrefixSyncStreaming + 'Error parsing new SSE message notification: %s'],
  [STREAMING_FALLBACK, logPrefixSyncStreaming + 'Falling back to polling mode. Reason: %s'],
  [SUBMITTERS_PUSH_FAILS, logPrefixSyncSubmitters + 'Droping %s %s after retry. Reason: %s.'],
  [SUBMITTERS_PUSH_RETRY, logPrefixSyncSubmitters + 'Failed to push %s %s, keeping data to retry on next iteration. Reason: %s.'],
  // SDK
  [ERROR_EVENTS_TRACKER, logPrefixEventsTracker + 'Failed to queue %s'],
  // client status
  [CLIENT_NOT_READY, '%s: the SDK is not ready, results may be incorrect. Make sure to wait for SDK readiness before using this method.'],
  [CLIENT_NO_LISTENER, 'No listeners for SDK Readiness detected. Incorrect control treatments could have been logged if you called getTreatment/s while the SDK was not yet ready.'],
  // input validation
  [WARN_SETTING_NULL, '%s: Property "%s" is of invalid type. Setting value to null.'],
  [WARN_TRIMMING_PROPERTIES, '%s: Event has more than 300 properties. Some of them will be trimmed when processed.'],
  [WARN_CONVERTING, '%s: %s "%s" is not of type string, converting.'],
  [WARN_TRIMMING, '%s: %s "%s" has extra whitespace, trimming.'],
  [WARN_NOT_EXISTENT_SPLIT, '%s: split "%s" does not exist in this environment, please double check what splits exist in the web console.'],
  [WARN_LOWERCASE_TRAFFIC_TYPE, '%s: traffic_type_name should be all lowercase - converting string to lowercase.'],
  [WARN_NOT_EXISTENT_TT, '%s: traffic type "%s" does not have any corresponding split in this environment, make sure you\'re tracking your events to a valid traffic type defined in the web console.'],
  // initialization / settings validation
  [WARN_INTEGRATION_INVALID, logPrefixSettings+': %s integration %s at settings %s invalid. %s'],
  [WARN_SPLITS_FILTER_IGNORED, logPrefixSettings+': split filters have been configured but will have no effect if mode is not "%s", since synchronization is being deferred to an external tool.'],
  [WARN_SPLITS_FILTER_INVALID, logPrefixSettings+': split filter at position %s is invalid. It must be an object with a valid filter type ("byName" or "byPrefix") and a list of "values".'],
  [WARN_SPLITS_FILTER_EMPTY, logPrefixSettings+': splitFilters configuration must be a non-empty array of filter objects.'],
  [WARN_STORAGE_INVALID, logPrefixSettings+': The provided storage is invalid. Fallbacking into default MEMORY storage'],
  [WARN_API_KEY, logPrefixSettings+': You already have %s. We recommend keeping only one instance of the factory at all times (Singleton pattern) and reusing it throughout your application']
]);
