import * as c from '../constants';
import { codesError } from './error';

export const codesWarn: [number, string][] = codesError.concat([
  // evaluator
  [c.ENGINE_VALUE_INVALID, c.LOG_PREFIX_ENGINE_VALUE + 'Value %s doesn\'t match with expected type.'],
  [c.ENGINE_VALUE_NO_ATTRIBUTES, c.LOG_PREFIX_ENGINE_VALUE + 'Defined attribute [%s], no attributes received.'],
  // synchronizer
  [c.SYNC_MYSEGMENTS_FETCH_RETRY, c.LOG_PREFIX_SYNC_MYSEGMENTS + 'Retrying download of segments #%s. Reason: %s'],
  [c.SYNC_SPLITS_FETCH_FAILS, c.LOG_PREFIX_SYNC_SPLITS + 'Error while doing fetch of feature flags. %s'],
  [c.STREAMING_PARSING_ERROR_FAILS, c.LOG_PREFIX_SYNC_STREAMING + 'Error parsing SSE error notification: %s'],
  [c.STREAMING_PARSING_MESSAGE_FAILS, c.LOG_PREFIX_SYNC_STREAMING + 'Error parsing SSE message notification: %s'],
  [c.STREAMING_FALLBACK, c.LOG_PREFIX_SYNC_STREAMING + 'Falling back to polling mode. Reason: %s'],
  [c.SUBMITTERS_PUSH_FAILS, c.LOG_PREFIX_SYNC_SUBMITTERS + 'Dropping %s after retry. Reason: %s.'],
  [c.SUBMITTERS_PUSH_RETRY, c.LOG_PREFIX_SYNC_SUBMITTERS + 'Failed to push %s, keeping data to retry on next iteration. Reason: %s.'],
  // client status
  [c.CLIENT_NOT_READY, '%s: the SDK is not ready, results may be incorrect. Make sure to wait for SDK readiness before using this method.'],
  [c.CLIENT_NO_LISTENER, 'No listeners for SDK Readiness detected. Incorrect control treatments could have been logged if you called getTreatment/s while the SDK was not yet ready.'],
  // input validation
  [c.WARN_SETTING_NULL, '%s: Property "%s" is of invalid type. Setting value to null.'],
  [c.WARN_TRIMMING_PROPERTIES, '%s: Event has more than 300 properties. Some of them will be trimmed when processed.'],
  [c.WARN_CONVERTING, '%s: %s "%s" is not of type string, converting.'],
  [c.WARN_TRIMMING, '%s: %s "%s" has extra whitespace, trimming.'],
  [c.WARN_NOT_EXISTENT_SPLIT, '%s: feature flag "%s" does not exist in this environment. Please double check what feature flags exist in the Split user interface.'],
  [c.WARN_LOWERCASE_TRAFFIC_TYPE, '%s: traffic_type_name should be all lowercase - converting string to lowercase.'],
  [c.WARN_NOT_EXISTENT_TT, '%s: traffic type "%s" does not have any corresponding feature flag in this environment, make sure you\'re tracking your events to a valid traffic type defined in the Split user interface.'],
  // initialization / settings validation
  [c.WARN_INTEGRATION_INVALID, c.LOG_PREFIX_SETTINGS+': %s integration item(s) at settings is invalid. %s'],
  [c.WARN_SPLITS_FILTER_IGNORED, c.LOG_PREFIX_SETTINGS+': feature flag filters have been configured but will have no effect if mode is not "%s", since synchronization is being deferred to an external tool.'],
  [c.WARN_SPLITS_FILTER_INVALID, c.LOG_PREFIX_SETTINGS+': feature flag filter at position %s is invalid. It must be an object with a valid filter type ("byName" or "byPrefix") and a list of "values".'],
  [c.WARN_SPLITS_FILTER_EMPTY, c.LOG_PREFIX_SETTINGS+': feature flag filter configuration must be a non-empty array of filter objects.'],
  [c.WARN_SDK_KEY, c.LOG_PREFIX_SETTINGS+': You already have %s. We recommend keeping only one instance of the factory at all times (Singleton pattern) and reusing it throughout your application'],

  [c.STREAMING_PARSING_MY_SEGMENTS_UPDATE_V2, c.LOG_PREFIX_SYNC_STREAMING + 'Fetching MySegments due to an error processing %s notification: %s'],
  [c.STREAMING_PARSING_SPLIT_UPDATE, c.LOG_PREFIX_SYNC_STREAMING + 'Fetching SplitChanges due to an error processing SPLIT_UPDATE notification: %s'],
]);
