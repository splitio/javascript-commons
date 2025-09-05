import SplitIO from '../../types/splitio';
import { IRBSegmentsCacheSync, ISegmentsCacheSync, ISplitsCacheSync } from './types';
import { ILogger } from '../logger/types';
import { isObject } from '../utils/lang';
import { isConsumerMode } from '../utils/settingsValidation/mode';
import { RolloutPlan } from './types';

/**
 * Validates if the given rollout plan is valid.
 */
export function validateRolloutPlan(log: ILogger, settings: SplitIO.ISettings): RolloutPlan | undefined {
  const { mode, initialRolloutPlan } = settings;

  if (isConsumerMode(mode)) {
    log.warn('storage: initial rollout plan is ignored in consumer mode');
    return;
  }

  if (isObject(initialRolloutPlan) && isObject((initialRolloutPlan as any).splitChanges)) return initialRolloutPlan as RolloutPlan;

  log.error('storage: invalid rollout plan provided');
  return;
}

/**
 * Sets the given synchronous storage with the provided rollout plan snapshot.
 * If `matchingKey` is provided, the storage is handled as a client-side storage (segments and largeSegments are instances of MySegmentsCache).
 * Otherwise, the storage is handled as a server-side storage (segments is an instance of SegmentsCache).
 */
export function setRolloutPlan(log: ILogger, rolloutPlan: RolloutPlan, storage: { splits?: ISplitsCacheSync, rbSegments?: IRBSegmentsCacheSync, segments: ISegmentsCacheSync, largeSegments?: ISegmentsCacheSync }, matchingKey?: string) {
  const { splits, rbSegments, segments, largeSegments } = storage;
  const { splitChanges: { ff, rbs } } = rolloutPlan;

  log.debug(`storage: set feature flags and segments${matchingKey ? ` for key ${matchingKey}` : ''}`);

  if (splits && ff) {
    splits.clear();
    splits.update(ff.d, [], ff.t);
  }

  if (rbSegments && rbs) {
    rbSegments.clear();
    rbSegments.update(rbs.d, [], rbs.t);
  }

  const segmentChanges = rolloutPlan.segmentChanges;
  if (matchingKey) { // add memberships data (client-side)
    let memberships = rolloutPlan.memberships && rolloutPlan.memberships[matchingKey];
    if (!memberships && segmentChanges) {
      memberships = {
        ms: {
          k: segmentChanges.filter(segment => {
            return segment.added.indexOf(matchingKey) > -1;
          }).map(segment => ({ n: segment.name }))
        }
      };
    }

    if (memberships) {
      if (memberships.ms) segments.resetSegments(memberships.ms!);
      if (memberships.ls && largeSegments) largeSegments.resetSegments(memberships.ls!);
    }
  } else { // add segments data (server-side)
    if (segmentChanges) {
      segments.clear();
      segmentChanges.forEach(segment => {
        segments.update(segment.name, segment.added, segment.removed, segment.till);
      });
    }
  }
}
