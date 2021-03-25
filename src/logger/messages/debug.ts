import { ENGINE_COMBINER_AND, ENGINE_COMBINER_IFELSEIF, ENGINE_COMBINER_IFELSEIF_NO_TREATMENT, ENGINE_BUCKET, ENGINE_MATCHER_ALL, ENGINE_MATCHER_BETWEEN, ENGINE_MATCHER_BOOLEAN, ENGINE_MATCHER_CONTAINS_ALL, ENGINE_MATCHER_CONTAINS_ANY, ENGINE_MATCHER_CONTAINS_STRING, ENGINE_MATCHER_DEPENDENCY, ENGINE_MATCHER_DEPENDENCY_PRE, ENGINE_MATCHER_EQUAL, ENGINE_MATCHER_EQUAL_TO_SET, ENGINE_MATCHER_ENDS_WITH, ENGINE_MATCHER_GREATER, ENGINE_MATCHER_LESS, ENGINE_MATCHER_PART_OF, ENGINE_MATCHER_SEGMENT, ENGINE_MATCHER_STRING, ENGINE_MATCHER_STRING_INVALID, ENGINE_MATCHER_STARTS_WITH, ENGINE_MATCHER_WHITELIST, ENGINE_VALUE, ENGINE_SANITIZE, RETRIEVE_CLIENT_DEFAULT, RETRIEVE_CLIENT_EXISTING, RETRIEVE_MANAGER, SYNC_OFFLINE_DATA, SYNC_SPLITS_FETCH, SYNC_SPLITS_NEW, SYNC_SPLITS_REMOVED, SYNC_SPLITS_SEGMENTS, STREAMING_NEW_MESSAGE, SYNC_TASK_START, SYNC_TASK_EXECUTE, SYNC_TASK_STOP, SETTINGS_SPLITS_FILTER, logPrefixSettings, logPrefixEngine, logPrefixEngineCombiner, logPrefixEngineMatcher, logPrefixEngineValue, logPrefixSyncOffline, logPrefixSync, logPrefixSyncSplits, logPrefixSyncStreaming, logPrefixCleanup, CLEANUP_REGISTERING, CLEANUP_DEREGISTERING } from '../constants';
import { codesInfo } from './info';

export const codesDebug: [number, string][] = codesInfo.concat([
  // evaluator
  [ENGINE_COMBINER_AND, logPrefixEngineCombiner + '[andCombiner] evaluates to %s'],
  [ENGINE_COMBINER_IFELSEIF, logPrefixEngineCombiner + 'Treatment found: %s'],
  [ENGINE_COMBINER_IFELSEIF_NO_TREATMENT, logPrefixEngineCombiner + 'All predicates evaluated, no treatment found.'],
  [ENGINE_BUCKET, logPrefixEngine + ': using algo "murmur" bucket %s for key %s using seed %s - treatment %s'],
  [ENGINE_MATCHER_ALL, logPrefixEngineMatcher + '[allMatcher] is always true'],
  [ENGINE_MATCHER_BETWEEN, logPrefixEngineMatcher + '[betweenMatcher] is %s between %s and %s? %s'],
  [ENGINE_MATCHER_BOOLEAN, logPrefixEngineMatcher + '[booleanMatcher] %s === %s'],
  [ENGINE_MATCHER_CONTAINS_ALL, logPrefixEngineMatcher + '[containsAllMatcher] %s contains all elements of %s? %s'],
  [ENGINE_MATCHER_CONTAINS_ANY, logPrefixEngineMatcher + '[containsAnyMatcher] %s contains at least an element of %s? %s'],
  [ENGINE_MATCHER_CONTAINS_STRING, logPrefixEngineMatcher + '[containsStringMatcher] %s contains %s? %s'],
  [ENGINE_MATCHER_DEPENDENCY, logPrefixEngineMatcher + '[dependencyMatcher] parent split "%s" evaluated to "%s" with label "%s". %s evaluated treatment is part of [%s] ? %s.'],
  [ENGINE_MATCHER_DEPENDENCY_PRE, logPrefixEngineMatcher + '[dependencyMatcher] will evaluate parent split: "%s" with key: %s %s'],
  [ENGINE_MATCHER_EQUAL, logPrefixEngineMatcher + '[equalToMatcher] is %s equal to %s? %s'],
  [ENGINE_MATCHER_EQUAL_TO_SET, logPrefixEngineMatcher + '[equalToSetMatcher] is %s equal to set %s? %s'],
  [ENGINE_MATCHER_ENDS_WITH, logPrefixEngineMatcher + '[endsWithMatcher] %s ends with %s? %s'],
  [ENGINE_MATCHER_GREATER, logPrefixEngineMatcher + '[greaterThanEqualMatcher] is %s greater than %s? %s'],
  [ENGINE_MATCHER_LESS, logPrefixEngineMatcher + '[lessThanEqualMatcher] is %s less than %s? %s'],
  [ENGINE_MATCHER_PART_OF, logPrefixEngineMatcher + '[partOfMatcher] %s is part of %s? %s'],
  [ENGINE_MATCHER_SEGMENT, logPrefixEngineMatcher + '[segmentMatcher] evaluated %s / %s => %s'],
  [ENGINE_MATCHER_STRING, logPrefixEngineMatcher + '[stringMatcher] does %s matches with %s? %s'],
  [ENGINE_MATCHER_STRING_INVALID, logPrefixEngineMatcher + '[stringMatcher] %s is an invalid regex'],
  [ENGINE_MATCHER_STARTS_WITH, logPrefixEngineMatcher + '[startsWithMatcher] %s starts with %s? %s'],
  [ENGINE_MATCHER_WHITELIST, logPrefixEngineMatcher + '[whitelistMatcher] evaluated %s in [%s] => %s'],
  [ENGINE_VALUE, logPrefixEngineValue + 'Extracted attribute [%s], [%s] will be used for matching.'],
  [ENGINE_SANITIZE, logPrefixEngine + ':sanitize: Attempted to sanitize [%s] which should be of type [%s]. Sanitized and processed value => [%s]'],
  // SDK
  [CLEANUP_REGISTERING, logPrefixCleanup + 'Registering cleanup handler %s'],
  [CLEANUP_DEREGISTERING, logPrefixCleanup + 'Deregistering cleanup handler %s'],
  [RETRIEVE_CLIENT_DEFAULT, ' Retrieving default SDK client.'],
  [RETRIEVE_CLIENT_EXISTING, ' Retrieving existing SDK client.'],
  [RETRIEVE_MANAGER, ' Retrieving manager instance.'],
  // synchronizer
  [SYNC_OFFLINE_DATA, logPrefixSyncOffline + 'Splits data: \n%s'],
  [SYNC_SPLITS_FETCH, logPrefixSyncSplits + 'Spin up split update using since = %s'],
  [SYNC_SPLITS_NEW, logPrefixSyncSplits + 'New splits %s'],
  [SYNC_SPLITS_REMOVED, logPrefixSyncSplits + 'Removed splits %s'],
  [SYNC_SPLITS_SEGMENTS, logPrefixSyncSplits + 'Segment names collected %s'],
  [STREAMING_NEW_MESSAGE, logPrefixSyncStreaming + 'New SSE message received, with data: %s.'],
  [SYNC_TASK_START, logPrefixSync + ': Starting %s. Running each %s millis'],
  [SYNC_TASK_EXECUTE, logPrefixSync + ': Running %s'],
  [SYNC_TASK_STOP, logPrefixSync + ': Stopping %s'],
  // initialization / settings validation
  [SETTINGS_SPLITS_FILTER, logPrefixSettings + ': splits filtering criteria is "%s".']
]);
