import * as c from '../constants';
import { codesInfo } from './info';

export const codesDebug: [number, string][] = codesInfo.concat([
  // evaluator
  [c.ENGINE_COMBINER_AND, c.logPrefixEngineCombiner + '[andCombiner] evaluates to %s'],
  [c.ENGINE_COMBINER_IFELSEIF, c.logPrefixEngineCombiner + 'Treatment found: %s'],
  [c.ENGINE_COMBINER_IFELSEIF_NO_TREATMENT, c.logPrefixEngineCombiner + 'All predicates evaluated, no treatment found.'],
  [c.ENGINE_BUCKET, c.logPrefixEngine + ': using algo "murmur" bucket %s for key %s using seed %s - treatment %s'],
  [c.ENGINE_MATCHER_ALL, c.logPrefixEngineMatcher + '[allMatcher] is always true'],
  [c.ENGINE_MATCHER_BETWEEN, c.logPrefixEngineMatcher + '[betweenMatcher] is %s between %s and %s? %s'],
  [c.ENGINE_MATCHER_BOOLEAN, c.logPrefixEngineMatcher + '[booleanMatcher] %s === %s'],
  [c.ENGINE_MATCHER_CONTAINS_ALL, c.logPrefixEngineMatcher + '[containsAllMatcher] %s contains all elements of %s? %s'],
  [c.ENGINE_MATCHER_CONTAINS_ANY, c.logPrefixEngineMatcher + '[containsAnyMatcher] %s contains at least an element of %s? %s'],
  [c.ENGINE_MATCHER_CONTAINS_STRING, c.logPrefixEngineMatcher + '[containsStringMatcher] %s contains %s? %s'],
  [c.ENGINE_MATCHER_DEPENDENCY, c.logPrefixEngineMatcher + '[dependencyMatcher] parent split "%s" evaluated to "%s" with label "%s". %s evaluated treatment is part of [%s] ? %s.'],
  [c.ENGINE_MATCHER_DEPENDENCY_PRE, c.logPrefixEngineMatcher + '[dependencyMatcher] will evaluate parent split: "%s" with key: %s %s'],
  [c.ENGINE_MATCHER_EQUAL, c.logPrefixEngineMatcher + '[equalToMatcher] is %s equal to %s? %s'],
  [c.ENGINE_MATCHER_EQUAL_TO_SET, c.logPrefixEngineMatcher + '[equalToSetMatcher] is %s equal to set %s? %s'],
  [c.ENGINE_MATCHER_ENDS_WITH, c.logPrefixEngineMatcher + '[endsWithMatcher] %s ends with %s? %s'],
  [c.ENGINE_MATCHER_GREATER, c.logPrefixEngineMatcher + '[greaterThanEqualMatcher] is %s greater than %s? %s'],
  [c.ENGINE_MATCHER_LESS, c.logPrefixEngineMatcher + '[lessThanEqualMatcher] is %s less than %s? %s'],
  [c.ENGINE_MATCHER_PART_OF, c.logPrefixEngineMatcher + '[partOfMatcher] %s is part of %s? %s'],
  [c.ENGINE_MATCHER_SEGMENT, c.logPrefixEngineMatcher + '[segmentMatcher] evaluated %s / %s => %s'],
  [c.ENGINE_MATCHER_STRING, c.logPrefixEngineMatcher + '[stringMatcher] does %s matches with %s? %s'],
  [c.ENGINE_MATCHER_STRING_INVALID, c.logPrefixEngineMatcher + '[stringMatcher] %s is an invalid regex'],
  [c.ENGINE_MATCHER_STARTS_WITH, c.logPrefixEngineMatcher + '[startsWithMatcher] %s starts with %s? %s'],
  [c.ENGINE_MATCHER_WHITELIST, c.logPrefixEngineMatcher + '[whitelistMatcher] evaluated %s in [%s] => %s'],
  [c.ENGINE_VALUE, c.logPrefixEngineValue + 'Extracted attribute [%s], [%s] will be used for matching.'],
  [c.ENGINE_SANITIZE, c.logPrefixEngine + ':sanitize: Attempted to sanitize [%s] which should be of type [%s]. Sanitized and processed value => [%s]'],
  // SDK
  [c.CLEANUP_REGISTERING, c.logPrefixCleanup + 'Registering cleanup handler %s'],
  [c.CLEANUP_DEREGISTERING, c.logPrefixCleanup + 'Deregistering cleanup handler %s'],
  [c.RETRIEVE_CLIENT_DEFAULT, ' Retrieving default SDK client.'],
  [c.RETRIEVE_CLIENT_EXISTING, ' Retrieving existing SDK client.'],
  [c.RETRIEVE_MANAGER, ' Retrieving manager instance.'],
  // synchronizer
  [c.SYNC_OFFLINE_DATA, c.logPrefixSyncOffline + 'Splits data: \n%s'],
  [c.SYNC_SPLITS_FETCH, c.logPrefixSyncSplits + 'Spin up split update using since = %s'],
  [c.SYNC_SPLITS_NEW, c.logPrefixSyncSplits + 'New splits %s'],
  [c.SYNC_SPLITS_REMOVED, c.logPrefixSyncSplits + 'Removed splits %s'],
  [c.SYNC_SPLITS_SEGMENTS, c.logPrefixSyncSplits + 'Segment names collected %s'],
  [c.STREAMING_NEW_MESSAGE, c.logPrefixSyncStreaming + 'New SSE message received, with data: %s.'],
  [c.SYNC_TASK_START, c.logPrefixSync + ': Starting %s. Running each %s millis'],
  [c.SYNC_TASK_EXECUTE, c.logPrefixSync + ': Running %s'],
  [c.SYNC_TASK_STOP, c.logPrefixSync + ': Stopping %s'],
  // initialization / settings validation
  [c.SETTINGS_SPLITS_FILTER, c.logPrefixSettings + ': splits filtering criteria is "%s".']
]);
