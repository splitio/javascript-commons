import SplitIO from '../../types/splitio';
import { IRBSegmentsCacheSync, ISegmentsCacheSync, ISplitsCacheSync, IStorageSync } from './types';
import { setToArray } from '../utils/lang/sets';
import { getMatching } from '../utils/key';
import { IMembershipsResponse, IMySegmentsResponse, ISegmentChangesResponse, ISplitChangesResponse } from '../dtos/types';
import { ILogger } from '../logger/types';
import { isObject } from '../utils/lang';

export type RolloutPlan = {
  /**
   * Feature flags and rule-based segments.
   */
  splitChanges: ISplitChangesResponse;
  /**
   * Optional map of matching keys to their memberships.
   */
  memberships?: {
    [matchingKey: string]: IMembershipsResponse;
  };
  /**
   * Optional list of standard segments.
   * This property is ignored if `memberships` is provided.
   */
  segmentChanges?: ISegmentChangesResponse[];
};

/**
 * Validates if the given rollout plan is valid.
 */
function validateRolloutPlan(rolloutPlan: unknown): rolloutPlan is RolloutPlan {
  if (isObject(rolloutPlan) && isObject((rolloutPlan as any).splitChanges)) return true;

  return false;
}

/**
 * Sets the given synchronous storage with the provided rollout plan snapshot.
 * If `matchingKey` is provided, the storage is handled as a client-side storage (segments and largeSegments are instances of MySegmentsCache).
 * Otherwise, the storage is handled as a server-side storage (segments is an instance of SegmentsCache).
 */
export function setRolloutPlan(log: ILogger, rolloutPlan: RolloutPlan, storage: { splits?: ISplitsCacheSync, rbSegments?: IRBSegmentsCacheSync, segments: ISegmentsCacheSync, largeSegments?: ISegmentsCacheSync }, matchingKey?: string) {
  // Do not load data if current rollout plan is empty
  if (!validateRolloutPlan(rolloutPlan)) {
    log.error('storage: invalid rollout plan provided');
    return;
  }

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
      segmentChanges.forEach(segment => {
        segments.update(segment.name, segment.added, segment.removed, segment.till);
      });
    }
  }
}

/**
 * Gets the rollout plan snapshot from the given synchronous storage.
 * If `keys` are provided, the memberships for those keys is returned, to protect segments data.
 * Otherwise, the segments data is returned.
 */
export function getRolloutPlan(log: ILogger, storage: IStorageSync, options: SplitIO.RolloutPlanOptions = {}): RolloutPlan {

  const { keys, exposeSegments } = options;
  const { splits, segments, rbSegments } = storage;

  log.debug(`storage: get feature flags${keys ? `, and memberships for keys ${keys}` : ''}${exposeSegments ? ', and segments' : ''}`);

  return {
    splitChanges: {
      ff: {
        t: splits.getChangeNumber(),
        s: -1,
        d: splits.getAll(),
      },
      rbs: {
        t: rbSegments.getChangeNumber(),
        s: -1,
        d: rbSegments.getAll(),
      }
    },
    segmentChanges: exposeSegments ? // @ts-ignore accessing private prop
      Object.keys(segments.segmentCache).map(segmentName => ({
        name: segmentName, // @ts-ignore
        added: setToArray(segments.segmentCache[segmentName] as Set<string>),
        removed: [],
        till: segments.getChangeNumber(segmentName)!
      })) :
      undefined,
    memberships: keys ?
      keys.reduce<Record<string, IMembershipsResponse>>((prev, key) => {
        const matchingKey = getMatching(key);
        if (storage.shared) { // Client-side segments
          const sharedStorage = storage.shared(matchingKey);
          prev[matchingKey] = {
            ms: { // @ts-ignore
              k: Object.keys(sharedStorage.segments.segmentCache).map(segmentName => ({ n: segmentName })),
            },
            ls: sharedStorage.largeSegments ? { // @ts-ignore
              k: Object.keys(sharedStorage.largeSegments.segmentCache).map(segmentName => ({ n: segmentName })),
            } : undefined
          };
        } else { // Server-side segments
          prev[matchingKey] = {
            ms: { // @ts-ignore
              k: Object.keys(storage.segments.segmentCache).reduce<IMySegmentsResponse['k']>((prev, segmentName) => { // @ts-ignore
                return storage.segments.segmentCache[segmentName].has(matchingKey) ?
                  prev!.concat({ n: segmentName }) :
                  prev;
              }, [])
            },
            ls: {
              k: []
            }
          };
        }
        return prev;
      }, {}) :
      undefined
  };
}
