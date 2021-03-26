import * as c from '../constants';
import { codesError } from './error';

export const codesWarn: [number, string][] = codesError.concat([
  // evaluator
  [c.ENGINE_VALUE_INVALID, c.logPrefixEngineValue + 'Value %s doesn\'t match with expected type.'],
  [c.ENGINE_VALUE_NO_ATTRIBUTES, c.logPrefixEngineValue + 'Defined attribute [%s], no attributes received.'],
  // synchronizer
  [c.SYNC_MYSEGMENTS_FETCH_RETRY, c.logPrefixSyncMysegments + 'Retrying download of segments #%s. Reason: %s'],
  [c.SYNC_SPLITS_FETCH_FAILS, c.logPrefixSyncSplits + 'Error while doing fetch of Splits. %s'],
  [c.STREAMING_PARSING_ERROR_FAILS, c.logPrefixSyncStreaming + 'Error parsing SSE error notification: %s'],
  [c.STREAMING_PARSING_MESSAGE_FAILS, c.logPrefixSyncStreaming + 'Error parsing SSE message notification: %s'],
  [c.STREAMING_FALLBACK, c.logPrefixSyncStreaming + 'Falling back to polling mode. Reason: %s'],
  [c.SUBMITTERS_PUSH_FAILS, c.logPrefixSyncSubmitters + 'Droping %s %s after retry. Reason: %s.'],
  [c.SUBMITTERS_PUSH_RETRY, c.logPrefixSyncSubmitters + 'Failed to push %s %s, keeping data to retry on next iteration. Reason: %s.'],
  // client status
  [c.CLIENT_NOT_READY, '%s: the SDK is not ready, results may be incorrect. Make sure to wait for SDK readiness before using this method.'],
  [c.CLIENT_NO_LISTENER, 'No listeners for SDK Readiness detected. Incorrect control treatments could have been logged if you called getTreatment/s while the SDK was not yet ready.'],
  // input validation
  [c.WARN_SETTING_NULL, '%s: Property "%s" is of invalid type. Setting value to null.'],
  [c.WARN_TRIMMING_PROPERTIES, '%s: Event has more than 300 properties. Some of them will be trimmed when processed.'],
  [c.WARN_CONVERTING, '%s: %s "%s" is not of type string, converting.'],
  [c.WARN_TRIMMING, '%s: %s "%s" has extra whitespace, trimming.'],
  [c.WARN_NOT_EXISTENT_SPLIT, '%s: split "%s" does not exist in this environment, please double check what splits exist in the web console.'],
  [c.WARN_LOWERCASE_TRAFFIC_TYPE, '%s: traffic_type_name should be all lowercase - converting string to lowercase.'],
  [c.WARN_NOT_EXISTENT_TT, '%s: traffic type "%s" does not have any corresponding split in this environment, make sure you\'re tracking your events to a valid traffic type defined in the web console.'],
  // initialization / settings validation
  [c.WARN_INTEGRATION_INVALID, c.logPrefixSettings+': %s integration %s at settings %s invalid. %s'],
  [c.WARN_SPLITS_FILTER_IGNORED, c.logPrefixSettings+': split filters have been configured but will have no effect if mode is not "%s", since synchronization is being deferred to an external tool.'],
  [c.WARN_SPLITS_FILTER_INVALID, c.logPrefixSettings+': split filter at position %s is invalid. It must be an object with a valid filter type ("byName" or "byPrefix") and a list of "values".'],
  [c.WARN_SPLITS_FILTER_EMPTY, c.logPrefixSettings+': splitFilters configuration must be a non-empty array of filter objects.'],
  [c.WARN_STORAGE_INVALID, c.logPrefixSettings+': The provided storage is invalid. Fallbacking into default MEMORY storage'],
  [c.WARN_API_KEY, c.logPrefixSettings+': You already have %s. We recommend keeping only one instance of the factory at all times (Singleton pattern) and reusing it throughout your application']
]);
