import { WARN_0, WARN_1, WARN_2, WARN_4, WARN_5, WARN_6, WARN_7, WARN_8, WARN_9, WARN_10, WARN_11, WARN_SETTING_NULL, WARN_TRIMMING_PROPERTIES, WARN_14, WARN_CONVERTING, WARN_TRIMMING, WARN_NOT_EXISTENT_SPLIT, WARN_LOWERCASE_TRAFFIC_TYPE, WARN_NOT_EXISTENT_TT, WARN_21, WARN_22, WARN_23, WARN_24, WARN_25, WARN_API_KEY } from '../constants';

export const codesWarn: [number, string][] = [
  [WARN_0, 'splitio-engine:value => Value %s %sdoesn\'t match with expected type.'],
  [WARN_1, 'splitio-engine:value => Defined attribute [%s], no attributes received.'],
  [WARN_2, 'No listeners for SDK Readiness detected. Incorrect control treatments could have been logged if you called getTreatment/s while the SDK was not yet ready.'],
  [WARN_4, 'splitio-sync:my-segments => Retrying download of segments #%s. Reason: %s'],
  [WARN_5, 'splitio-sync:split-changes => Error while doing fetch of Splits. %s'],
  [WARN_6, 'splitio-sync:sse-handler => Error parsing SSE error notification: %s'],
  [WARN_7, 'splitio-sync:sse-handler => Error parsing new SSE message notification: %s'],
  [WARN_8, 'splitio-sync:push-manager => %sFalling back to polling mode.'],
  [WARN_9, 'splitio-sync:submitters => Droping %s %s after retry. Reason %s.'],
  [WARN_10, 'splitio-sync:submitters => Failed to push %s %s, keeping data to retry on next iteration. Reason %s.'],
  [WARN_11, 'splitio-client:event-tracker => Failed to queue %s'],
  // input validation
  [WARN_SETTING_NULL, '%s: Property "%s" is of invalid type. Setting value to null.'],
  [WARN_TRIMMING_PROPERTIES, '%s: Event has more than 300 properties. Some of them will be trimmed when processed.'],
  [WARN_14, '%s: the SDK is not ready, results may be incorrect. Make sure to wait for SDK readiness before using this method.'],
  [WARN_CONVERTING, '%s: %s "%s" is not of type string, converting.'],
  [WARN_TRIMMING, '%s: %s "%s" has extra whitespace, trimming.'],
  [WARN_NOT_EXISTENT_SPLIT, '%s: split "%s" does not exist in this environment, please double check what splits exist in the web console.'],
  [WARN_LOWERCASE_TRAFFIC_TYPE, '%s: traffic_type_name should be all lowercase - converting string to lowercase.'],
  [WARN_NOT_EXISTENT_TT, '%s: traffic type "%s" does not have any corresponding split in this environment, make sure you\'re tracking your events to a valid traffic type defined in the web console.'],
  // initialization / settings validation
  [WARN_21, 'splitio-settings => %s integration %s at settings %s invalid. %s'],
  [WARN_22, 'Factory instantiation: split filters have been configured but will have no effect if mode is not "%s", since synchronization is being deferred to an external tool.'],
  [WARN_23, 'Factory instantiation: split filter at position %s is invalid. It must be an object with a valid filter type ("byName" or "byPrefix") and a list of "values".'],
  [WARN_24, 'Factory instantiation: splitFilters configuration must be a non-empty array of filter objects.'],
  [WARN_25, 'splitio-settings => The provided storage is invalid. Fallbacking into default MEMORY storage'],
  [WARN_API_KEY, 'Factory instantiation: %s. We recommend keeping only one instance of the factory at all times (Singleton pattern) and reusing it throughout your application']
];
