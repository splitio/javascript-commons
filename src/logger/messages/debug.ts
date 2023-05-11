import * as c from '../constants';
import { codesInfo } from './info';

export const codesDebug: [number, string][] = codesInfo.concat([
  // evaluator
  [c.ENGINE_COMBINER_AND, c.LOG_PREFIX_ENGINE_COMBINER + '[andCombiner] evaluates to %s'],
  [c.ENGINE_COMBINER_IFELSEIF, c.LOG_PREFIX_ENGINE_COMBINER + 'Treatment found: %s'],
  [c.ENGINE_COMBINER_IFELSEIF_NO_TREATMENT, c.LOG_PREFIX_ENGINE_COMBINER + 'All predicates evaluated, no treatment found.'],
  [c.ENGINE_BUCKET, c.LOG_PREFIX_ENGINE + ': using algo "murmur" bucket %s for key %s using seed %s - treatment %s'],
  [c.ENGINE_MATCHER_ALL, c.LOG_PREFIX_ENGINE_MATCHER + '[allMatcher] is always true'],
  [c.ENGINE_MATCHER_BETWEEN, c.LOG_PREFIX_ENGINE_MATCHER + '[betweenMatcher] is %s between %s and %s? %s'],
  [c.ENGINE_MATCHER_BOOLEAN, c.LOG_PREFIX_ENGINE_MATCHER + '[booleanMatcher] %s === %s'],
  [c.ENGINE_MATCHER_CONTAINS_ALL, c.LOG_PREFIX_ENGINE_MATCHER + '[containsAllMatcher] %s contains all elements of %s? %s'],
  [c.ENGINE_MATCHER_CONTAINS_ANY, c.LOG_PREFIX_ENGINE_MATCHER + '[containsAnyMatcher] %s contains at least an element of %s? %s'],
  [c.ENGINE_MATCHER_CONTAINS_STRING, c.LOG_PREFIX_ENGINE_MATCHER + '[containsStringMatcher] %s contains %s? %s'],
  [c.ENGINE_MATCHER_DEPENDENCY, c.LOG_PREFIX_ENGINE_MATCHER + '[dependencyMatcher] parent feature flag "%s" evaluated to "%s" with label "%s". %s evaluated treatment is part of [%s] ? %s.'],
  [c.ENGINE_MATCHER_DEPENDENCY_PRE, c.LOG_PREFIX_ENGINE_MATCHER + '[dependencyMatcher] will evaluate parent feature flag: "%s" with key: %s %s'],
  [c.ENGINE_MATCHER_EQUAL, c.LOG_PREFIX_ENGINE_MATCHER + '[equalToMatcher] is %s equal to %s? %s'],
  [c.ENGINE_MATCHER_EQUAL_TO_SET, c.LOG_PREFIX_ENGINE_MATCHER + '[equalToSetMatcher] is %s equal to set %s? %s'],
  [c.ENGINE_MATCHER_ENDS_WITH, c.LOG_PREFIX_ENGINE_MATCHER + '[endsWithMatcher] %s ends with %s? %s'],
  [c.ENGINE_MATCHER_GREATER, c.LOG_PREFIX_ENGINE_MATCHER + '[greaterThanEqualMatcher] is %s greater than %s? %s'],
  [c.ENGINE_MATCHER_LESS, c.LOG_PREFIX_ENGINE_MATCHER + '[lessThanEqualMatcher] is %s less than %s? %s'],
  [c.ENGINE_MATCHER_PART_OF, c.LOG_PREFIX_ENGINE_MATCHER + '[partOfMatcher] %s is part of %s? %s'],
  [c.ENGINE_MATCHER_SEGMENT, c.LOG_PREFIX_ENGINE_MATCHER + '[segmentMatcher] evaluated %s / %s => %s'],
  [c.ENGINE_MATCHER_STRING, c.LOG_PREFIX_ENGINE_MATCHER + '[stringMatcher] does %s matches with %s? %s'],
  [c.ENGINE_MATCHER_STRING_INVALID, c.LOG_PREFIX_ENGINE_MATCHER + '[stringMatcher] %s is an invalid regex'],
  [c.ENGINE_MATCHER_STARTS_WITH, c.LOG_PREFIX_ENGINE_MATCHER + '[startsWithMatcher] %s starts with %s? %s'],
  [c.ENGINE_MATCHER_WHITELIST, c.LOG_PREFIX_ENGINE_MATCHER + '[whitelistMatcher] evaluated %s in [%s] => %s'],
  [c.ENGINE_VALUE, c.LOG_PREFIX_ENGINE_VALUE + 'Extracted attribute [%s], [%s] will be used for matching.'],
  [c.ENGINE_SANITIZE, c.LOG_PREFIX_ENGINE + ':sanitize: Attempted to sanitize [%s] which should be of type [%s]. Sanitized and processed value => [%s]'],
  // SDK
  [c.CLEANUP_REGISTERING, c.LOG_PREFIX_CLEANUP + 'Registering cleanup handler %s'],
  [c.CLEANUP_DEREGISTERING, c.LOG_PREFIX_CLEANUP + 'Deregistering cleanup handler %s'],
  [c.RETRIEVE_CLIENT_DEFAULT, 'Retrieving default SDK client.'],
  [c.RETRIEVE_CLIENT_EXISTING, 'Retrieving existing SDK client.'],
  [c.RETRIEVE_MANAGER, 'Retrieving manager instance.'],
  // synchronizer
  [c.SYNC_OFFLINE_DATA, c.LOG_PREFIX_SYNC_OFFLINE + 'Feature flags data: \n%s'],
  [c.SYNC_SPLITS_FETCH, c.LOG_PREFIX_SYNC_SPLITS + 'Spin up feature flags update using since = %s'],
  [c.SYNC_SPLITS_NEW, c.LOG_PREFIX_SYNC_SPLITS + 'New feature flags %s'],
  [c.SYNC_SPLITS_REMOVED, c.LOG_PREFIX_SYNC_SPLITS + 'Removed feature flags %s'],
  [c.SYNC_SPLITS_SEGMENTS, c.LOG_PREFIX_SYNC_SPLITS + 'Segment names collected %s'],
  [c.STREAMING_NEW_MESSAGE, c.LOG_PREFIX_SYNC_STREAMING + 'New SSE message received, with data: %s.'],
  [c.SYNC_TASK_START, c.LOG_PREFIX_SYNC + ': Starting %s. Running each %s millis'],
  [c.SYNC_TASK_EXECUTE, c.LOG_PREFIX_SYNC + ': Running %s'],
  [c.SYNC_TASK_STOP, c.LOG_PREFIX_SYNC + ': Stopping %s'],
  // initialization / settings validation
  [c.SETTINGS_SPLITS_FILTER, c.LOG_PREFIX_SETTINGS + ': feature flags filtering criteria is "%s".']
]);
