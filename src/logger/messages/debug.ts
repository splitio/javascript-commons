import { DEBUG_ENGINE_COMBINER_AND, DEBUG_1, DEBUG_2, DEBUG_3, DEBUG_4, DEBUG_5, DEBUG_6, DEBUG_7, DEBUG_8, DEBUG_9, DEBUG_10, DEBUG_11, DEBUG_12, DEBUG_13, DEBUG_14, DEBUG_15, DEBUG_16, DEBUG_17, DEBUG_18, DEBUG_19, DEBUG_20, DEBUG_21, DEBUG_22, DEBUG_23, DEBUG_24, DEBUG_25, DEBUG_32, DEBUG_33, DEBUG_36, DEBUG_42, DEBUG_43, DEBUG_44, DEBUG_45, DEBUG_46, DEBUG_47, DEBUG_48, DEBUG_49, DEBUG_50, DEBUG_SPLITS_FILTER, SETTINGS_LB, ENGINE_LB, ENGINE_COMBINER_LB, ENGINE_MATCHER_LB, ENGINE_VALUE_LB, SYNC_OFFLINE_LB, IMPRESSIONS_TRACKER_LB, SYNC_LB, SYNC_SPLITS_LB, SYNC_STREAMING_LB } from '../constants';

export const codesDebug: [number, string][] = [
  // evaluator
  [DEBUG_ENGINE_COMBINER_AND, ENGINE_COMBINER_LB + '[andCombiner] evaluates to %s'],
  [DEBUG_1, ENGINE_COMBINER_LB + 'Treatment found: %s'],
  [DEBUG_2, ENGINE_COMBINER_LB + 'All predicates evaluated, no treatment found.'],
  [DEBUG_3, ENGINE_LB + ': using algo "murmur" bucket %s for key %s using seed %s - treatment %s'],
  [DEBUG_4, ENGINE_MATCHER_LB + '[allMatcher] is always true'],
  [DEBUG_5, ENGINE_MATCHER_LB + '[betweenMatcher] is %s between %s and %s? %s'],
  [DEBUG_6, ENGINE_MATCHER_LB + '[booleanMatcher] %s === %s'],
  [DEBUG_7, ENGINE_MATCHER_LB + '[containsAllMatcher] %s contains all elements of %s? %s'],
  [DEBUG_8, ENGINE_MATCHER_LB + '[containsAnyMatcher] %s contains at least an element of %s? %s'],
  [DEBUG_9, ENGINE_MATCHER_LB + '[containsStringMatcher] %s contains %s? %s'],
  [DEBUG_10, ENGINE_MATCHER_LB + '[dependencyMatcher] Parent split "%s" evaluated to "%s" with label "%s". %s evaluated treatment is part of [%s] ? %s.'],
  [DEBUG_11, ENGINE_MATCHER_LB + '[dependencyMatcher] will evaluate parent split: "%s" with key: %s %s'],
  [DEBUG_12, ENGINE_MATCHER_LB + '[equalToMatcher] is %s equal to %s? %s'],
  [DEBUG_13, ENGINE_MATCHER_LB + '[equalToSetMatcher] is %s equal to set %s? %s'],
  [DEBUG_14, ENGINE_MATCHER_LB + '[endsWithMatcher] %s ends with %s? %s'],
  [DEBUG_15, ENGINE_MATCHER_LB + '[greaterThanEqualMatcher] is %s greater than %s? %s'],
  [DEBUG_16, ENGINE_MATCHER_LB + '[lessThanEqualMatcher] is %s less than %s? %s'],
  [DEBUG_17, ENGINE_MATCHER_LB + '[partOfMatcher] %s is part of %s? %s'],
  [DEBUG_18, ENGINE_MATCHER_LB + '[asyncSegmentMatcher] evaluated %s / %s => %s'],
  [DEBUG_19, ENGINE_MATCHER_LB + '[segmentMatcher] evaluated %s / %s => %s'],
  [DEBUG_20, ENGINE_MATCHER_LB + '[stringMatcher] does %s matches with %s? %s'],
  [DEBUG_21, ENGINE_MATCHER_LB + '[stringMatcher] %s is an invalid regex'],
  [DEBUG_22, ENGINE_MATCHER_LB + '[startsWithMatcher] %s starts with %s? %s'],
  [DEBUG_23, ENGINE_MATCHER_LB + '[whitelistMatcher] evaluated %s in [%s] => %s'],
  [DEBUG_24, ENGINE_VALUE_LB + 'Extracted attribute [%s], [%s] will be used for matching.'],
  [DEBUG_25, ENGINE_LB + ':sanitize: Attempted to sanitize [%s] which should be of type [%s]. Sanitized and processed value => [%s]'],
  // SDK
  [DEBUG_32, ' Retrieving default SDK client.'],
  [DEBUG_33, ' Retrieving existing SDK client.'],
  // synchronizer
  [DEBUG_36, SYNC_OFFLINE_LB + 'Splits data: \n%s'],
  [DEBUG_42, SYNC_SPLITS_LB + 'Spin up split update using since = %s'],
  [DEBUG_43, SYNC_SPLITS_LB + 'New splits %s'],
  [DEBUG_44, SYNC_SPLITS_LB + 'Removed splits %s'],
  [DEBUG_45, SYNC_SPLITS_LB + 'Segment names collected %s'],
  [DEBUG_46, SYNC_STREAMING_LB + 'New SSE message received, with data: %s.'],
  [DEBUG_47, SYNC_LB + ': Starting %s. Running each %s millis'],
  [DEBUG_48, SYNC_LB + ': Running %s'],
  [DEBUG_49, SYNC_LB + ': Stopping %s'],
  [DEBUG_50, IMPRESSIONS_TRACKER_LB + 'Successfully stored %s impression%s.'],
  // initialization / settings validation
  [DEBUG_SPLITS_FILTER, SETTINGS_LB + ': splits filtering criteria is "%s".']
];
