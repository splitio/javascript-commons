import * as c from '../constants';
import { codesInfo } from './info';

export const codesDebug: [number, string][] = codesInfo.concat([
  // evaluator
  [c.ENGINE_COMBINER_AND, c.LOG_PREFIX_ENGINE_COMBINER + '[andCombiner] evaluates to %s'],
  [c.ENGINE_COMBINER_IFELSEIF, c.LOG_PREFIX_ENGINE_COMBINER + 'Treatment found: %s'],
  [c.ENGINE_COMBINER_IFELSEIF_NO_TREATMENT, c.LOG_PREFIX_ENGINE_COMBINER + 'All predicates evaluated, no treatment found.'],
  [c.ENGINE_BUCKET, c.LOG_PREFIX_ENGINE + ': using algo "murmur" bucket %s for key %s using seed %s - treatment %s'],
  [c.ENGINE_MATCHER_DEPENDENCY, c.LOG_PREFIX_ENGINE_MATCHER + '[IN_SPLIT_TREATMENT] parent feature flag "%s" evaluated to "%s" with label "%s". %s evaluated treatment is part of %s ? %s.'],
  [c.ENGINE_MATCHER_DEPENDENCY_PRE, c.LOG_PREFIX_ENGINE_MATCHER + '[IN_SPLIT_TREATMENT] will evaluate parent feature flag: "%s" with key: %s %s'],
  [c.ENGINE_VALUE, c.LOG_PREFIX_ENGINE_VALUE + 'Extracted attribute `%s`. %s will be used for matching.'],
  [c.ENGINE_SANITIZE, c.LOG_PREFIX_ENGINE + ':sanitize: Attempted to sanitize %s which should be of type %s. Sanitized and processed value => %s'],
  [c.ENGINE_MATCHER_RESULT, c.LOG_PREFIX_ENGINE_MATCHER + '[%s] Result: %s. Rule value: %s. Evaluation value: %s'],
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
