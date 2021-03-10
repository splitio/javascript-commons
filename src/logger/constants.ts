// commons
export const DEBUG_0 = 'splitio-engine:combiner => [andCombiner] evaluates to %s';
export const DEBUG_1 = 'splitio-engine:combiner => Treatment found: %s';
export const DEBUG_2 = 'splitio-engine:combiner => All predicates evaluated, no treatment found.';
export const DEBUG_3 = 'splitio-engine => [engine] using algo \'murmur\' bucket %s for key %s using seed %s - treatment %s';
export const DEBUG_4 = 'splitio-engine:matcher => [allMatcher] is always true';
export const DEBUG_5 = 'splitio-engine:matcher => [betweenMatcher] is %s between %s and %s? %s';
export const DEBUG_6 = 'splitio-engine:matcher => [booleanMatcher] %s === %s';
export const DEBUG_7 = 'splitio-engine:matcher => [containsAllMatcher] %s contains all elements of %s? %s';
export const DEBUG_8 = 'splitio-engine:matcher => [containsAnyMatcher] %s contains at least an element of %s? %s';
export const DEBUG_9 = 'splitio-engine:matcher => [containsStringMatcher] %s contains %s? %s';
export const DEBUG_10 = 'splitio-engine:matcher => [dependencyMatcher] Parent split "%s" evaluated to "%s" with label "%s". %s evaluated treatment is part of [%s] ? %s.';
export const DEBUG_11 = 'splitio-engine:matcher => [dependencyMatcher] will evaluate parent split: "%s" with key: %s %s';
export const DEBUG_12 = 'splitio-engine:matcher => [equalToMatcher] is %s equal to %s? %s';
export const DEBUG_13 = 'splitio-engine:matcher => [equalToSetMatcher] is %s equal to set %s? %s';
export const DEBUG_14 = 'splitio-engine:matcher => [endsWithMatcher] %s ends with %s? %s';
export const DEBUG_15 = 'splitio-engine:matcher => [greaterThanEqualMatcher] is %s greater than %s? %s';
export const DEBUG_16 = 'splitio-engine:matcher => [lessThanEqualMatcher] is %s less than %s? %s';
export const DEBUG_17 = 'splitio-engine:matcher => [partOfMatcher] %s is part of %s? %s';
export const DEBUG_18 = 'splitio-engine:matcher => [asyncSegmentMatcher] evaluated %s / %s => %s';
export const DEBUG_19 = 'splitio-engine:matcher => [segmentMatcher] evaluated %s / %s => %s';
export const DEBUG_20 = 'splitio-engine:matcher => [stringMatcher] does %s matches with %s? %s';
export const DEBUG_21 = 'splitio-engine:matcher => [stringMatcher] %s is an invalid regex';
export const DEBUG_22 = 'splitio-engine:matcher => [startsWithMatcher] %s starts with %s? %s';
export const DEBUG_23 = 'splitio-engine:matcher => [whitelistMatcher] evaluated %s in [%s] => %s';
export const DEBUG_24 = 'splitio-engine:value => Extracted attribute [%s], [%s] will be used for matching.';
export const DEBUG_25 = 'splitio-engine:sanitize => Attempted to sanitize [%s] which should be of type [%s]. \n Sanitized and processed value => [%s]';
export const DEBUG_31 = 'splitio => Retrieving SDK client.';
export const DEBUG_32 = 'splitio => Retrieving default SDK client.'; // @TODO remove and use 'splitio => Retrieving SDK client.'
export const DEBUG_33 = 'splitio => Retrieving existing SDK client.';
export const DEBUG_36 = 'splitio-producer:offline => Splits data: ';
export const DEBUG_42 = 'splitio-sync:split-changes => Spin up split update using since = %s';
export const DEBUG_43 = 'splitio-sync:split-changes => New splits %s';
export const DEBUG_44 = 'splitio-sync:split-changes => Removed splits %s';
export const DEBUG_45 = 'splitio-sync:split-changes => Segment names collected %s';
export const DEBUG_46 = 'splitio-sync:sse-handler => New SSE message received, with data: %s.';
export const DEBUG_47 = 'splitio-sync:task => Starting %s. Running each %s millis';
export const DEBUG_48 = 'splitio-sync:task => Running %s';
export const DEBUG_49 = 'splitio-sync:task => Stopping %s';
export const DEBUG_50 = 'splitio-client:impressions-tracker => Successfully stored %s impression%s.';
export const DEBUG_51 = 'Factory instantiation: splits filtering criteria is \'%s\'.';

// browser
export const DEBUG_26 = 'splitio-client:cleanup => Registering flush handler when unload page event is triggered.';
export const DEBUG_27 = 'splitio-client:cleanup => Deregistering flush handler when unload page event is triggered.';

// node
export const DEBUG_28 = 'splitio-client:cleanup => Registering cleanup handlers.';
export const DEBUG_29 = 'splitio-client:cleanup => Deregistering cleanup handlers.';
export const DEBUG_30 = 'splitio-client:cleanup => Split SDK graceful shutdown after SIGTERM.';
export const DEBUG_39 = 'splitio-sync:segment-changes => Processed %s with till = %s. Added: %s. Removed: %s';
export const DEBUG_40 = 'splitio-sync:segment-changes => Processing segment %s';
export const DEBUG_41 = 'splitio-sync:segment-changes => Started segments update';
export const DEBUG_34 = 'splitio-offline:splits-fetcher => Ignoring empty line or comment at #%s';
export const DEBUG_35 = 'splitio-offline:splits-fetcher => Ignoring line since it does not have exactly two columns #%s';
export const DEBUG_37 = 'splitio-sync:polling-manager => Splits will be refreshed each %s millis'; // @TODO remove since we already log it in syncTask debug log?
export const DEBUG_38 = 'splitio-sync:polling-manager => Segments will be refreshed each %s millis'; // @TODO remove since we already log it in syncTask debug log?


export const ERROR_0 = 'splitio-engine:combiner => Invalid Split provided, no valid conditions found';
export const ERROR_2 = 'splitio-utils:logger => Invalid Log Level - No changes to the logs will be applied.';
export const ERROR_3 = 'A listener was added for %s on the SDK, which has already fired and won\'t be emitted again. The callback won\'t be executed.';
export const ERROR_4 = 'splitio => Manager instance is not available. Provide the manager module on settings.';
export const ERROR_5 = 'splitio-services:service => %s The SDK will not get ready.';
export const ERROR_7 = 'splitio-producer:offline => There was an issue loading the mock Splits data, no changes will be applied to the current cache. %s';
export const ERROR_9 = 'splitio-sync:sse-handler => Fail to connect to streaming, with error message: %s';
export const ERROR_10 = 'splitio-sync:push-manager => Failed to authenticate for streaming. Error: "%s".';
export const ERROR_11 = 'splitio-client:impressions-tracker => Could not store impressions bulk with %s impression%s. Error: %s';
export const ERROR_12 = 'splitio-client:impressions-tracker => Impression listener logImpression method threw: %s.';
export const ERROR_13 = '%s: attributes must be a plain object.';
export const ERROR_14 = '%s: you passed "%s", event_type must adhere to the regular expression /^[a-zA-Z0-9][-_.:a-zA-Z0-9]{0,79}$/g. This means an event_type must be alphanumeric, cannot be more than 80 characters long, and can only include a dash, underscore, period, or colon as separators of alphanumeric characters.';
export const ERROR_15 = '%s: you passed a null or undefined event_type, event_type must be a non-empty string.';
export const ERROR_16 = '%s: you passed an invalid event_type, event_type must be a non-empty string.';
export const ERROR_17 = '%s: you passed an empty event_type, event_type must be a non-empty string.';
export const ERROR_18 = '%s: properties must be a plain object.';
export const ERROR_19 = '%s: The maximum size allowed for the properties is 32768 bytes, which was exceeded. Event not queued.';
export const ERROR_20 = '%s: value must be a finite number.';
export const ERROR_21 = 'Client has already been destroyed - no calls possible.';
export const ERROR_22 = '%s: you passed a null or undefined %s, %s must be a non-empty string.';
export const ERROR_23 = '%s: %s too long, %s must be 250 characters or less.';
export const ERROR_24 = '%s: you passed an invalid %s type, %s must be a non-empty string.';
export const ERROR_25 = '%s: you passed an empty string, %s must be a non-empty string.';
export const ERROR_26 = '%s: Key must be an object with bucketingKey and matchingKey with valid string properties.';
export const ERROR_32 = '%s: you passed an invalid %s, %s must be a non-empty string.';
export const ERROR_33 = '%s: you passed an empty %s, %s must be a non-empty string.';
export const ERROR_34 = '%s: %s must be a non-empty array.';
export const ERROR_35 = '%s: you passed a null or undefined traffic_type_name, traffic_type_name must be a non-empty string.';
export const ERROR_36 = '%s: you passed an invalid traffic_type_name, traffic_type_name must be a non-empty string.';
export const ERROR_37 = '%s: you passed an empty traffic_type_name, traffic_type_name must be a non-empty string.';
export const ERROR_38 = 'splitio-settings => You passed an invalid impressionsMode, impressionsMode should be one of the following values: \'%s\' or \'%s\'. Defaulting to \'%s\' mode.';
export const ERROR_39 = 'Response status is not OK. Status: %s. URL: %s. Message: %s';

// node
export const ERROR_1 = 'splitio-client:cleanup => Error with Split graceful shutdown: %s';
export const ERROR_8 = 'splitio-sync:segment-changes => Factory instantiation: you passed a Browser type authorizationKey, please grab an Api Key from the Split web console that is of type SDK.';
export const ERROR_6 = 'splitio-offline:splits-fetcher => Ignoring entry on YAML since the format is incorrect.';

export const INFO_0 = 'Split SDK is ready from cache.';
export const INFO_1 = 'Split SDK is ready.';
export const INFO_2 = 'splitio-client => Split: %s. Key: %s. Evaluation: %s. Label: %s';
export const INFO_3 = 'splitio-client => Queueing corresponding impression.';
export const INFO_4 = 'splitio => New shared client instance created.';
export const INFO_5 = 'splitio => New Split SDK instance created.';
export const INFO_6 = 'splitio => Manager instance retrieved.';
export const INFO_7 = 'splitio-sync:polling-manager => Turning segments data polling %s.';
export const INFO_8 = 'splitio-sync:polling-manager => Starting polling';
export const INFO_9 = 'splitio-sync:polling-manager => Stopping polling';
export const INFO_10 = 'splitio-sync:split-changes => Retrying download of splits #%s. Reason: %s';
export const INFO_11 = 'splitio-sync:push-manager => Refreshing streaming token in %s seconds.';
export const INFO_12 = 'splitio-sync:push-manager => Attempting to reconnect in %s seconds.';
export const INFO_13 = 'splitio-sync:push-manager => Connecting to push streaming.';
export const INFO_14 = 'splitio-sync:push-manager => Streaming is not available. Switching to polling mode.';
export const INFO_15 = 'splitio-sync:push-manager => Disconnecting from push streaming.';
export const INFO_16 = 'splitio-sync:submitters => Flushing full events queue and reseting timer.';
export const INFO_17 = 'splitio-sync:submitters => Pushing %s %s.';
export const INFO_18 = 'splitio-sync:sync-manager => Streaming not available. Starting periodic fetch of data.';
export const INFO_19 = 'splitio-sync:sync-manager => Streaming couldn\'t connect. Continue periodic fetch of data.';
export const INFO_20 = 'splitio-sync:sync-manager => PUSH (re)connected. Syncing and stopping periodic fetch of data.';
export const INFO_21 = 'splitio-client:event-tracker => Successfully qeued %s';

export const WARN_0 = 'splitio-engine:value => Value %s %sdoesn\'t match with expected type.';
export const WARN_1 = 'splitio-engine:value => Defined attribute [%s], no attributes received.';
export const WARN_2 = 'No listeners for SDK Readiness detected. Incorrect control treatments could have been logged if you called getTreatment/s while the SDK was not yet ready.';
export const WARN_4 = 'splitio-sync:my-segments => Retrying download of segments #%s. Reason: %s';
export const WARN_5 = 'splitio-sync:split-changes => Error while doing fetch of Splits. %s';
export const WARN_6 = 'splitio-sync:sse-handler => Error parsing SSE error notification: %s';
export const WARN_7 = 'splitio-sync:sse-handler => Error parsing new SSE message notification: %s';
export const WARN_8 = 'splitio-sync:push-manager => %sFalling back to polling mode.';
export const WARN_9 = 'splitio-sync:submitters => Droping %s %s after retry. Reason %s.';
export const WARN_10 = 'splitio-sync:submitters => Failed to push %s %s, keeping data to retry on next iteration. Reason %s.';
export const WARN_11 = 'splitio-client:event-tracker => Failed to queue %s';
export const WARN_12 = '%s: Property %s is of invalid type. Setting value to null.';
export const WARN_13 = '%s: Event has more than 300 properties. Some of them will be trimmed when processed.';
export const WARN_14 = '%s: the SDK is not ready, results may be incorrect. Make sure to wait for SDK readiness before using this method.';
export const WARN_15 = '%s: %s "%s" is not of type string, converting.';
export const WARN_17 = '%s: %s "%s" has extra whitespace, trimming.';
export const WARN_18 = '%s: you passed "%s" that does not exist in this environment, please double check what Splits exist in the web console.';
export const WARN_19 = '%s: traffic_type_name should be all lowercase - converting string to lowercase.';
export const WARN_20 = '%s: Traffic Type %s does not have any corresponding Splits in this environment, make sure you\'re tracking your events to a valid traffic type defined in the Split console.';
export const WARN_21 = 'splitio-settings => %s integration %s at settings %s invalid. %s';
export const WARN_22 = 'Factory instantiation: split filters have been configured but will have no effect if mode is not \'%s\', since synchronization is being deferred to an external tool.';
export const WARN_23 = 'Factory instantiation: split filter at position \'%s\' is invalid. It must be an object with a valid filter type (\'byName\' or \'byPrefix\') and a list of \'values\'.';
export const WARN_24 = 'Factory instantiation: splitFilters configuration must be a non-empty array of filter objects.';
export const WARN_25 = 'splitio-settings => The provided storage is invalid. Fallbacking into default MEMORY storage';

// node
export const WARN_3 = 'splitio-offline:splits-fetcher => .split mocks will be deprecated soon in favor of YAML files, which provide more targeting power. Take a look in our documentation.';
