import SplitIO from '../../types/splitio';
import { IRBSegmentsCacheSync, ISegmentsCacheSync, ISplitsCacheSync, IStorageSync } from './types';
import { setToArray } from '../utils/lang/sets';
import { getMatching } from '../utils/key';
import { IMembershipsResponse, IMySegmentsResponse, IRBSegment, ISplit } from '../dtos/types';
import { ILogger } from '../logger/types';

/**
 * Sets the given synchronous storage with the provided rollout plan snapshot.
 * If `matchingKey` is provided, the storage is handled as a client-side storage (segments and largeSegments are instances of MySegmentsCache).
 * Otherwise, the storage is handled as a server-side storage (segments is an instance of SegmentsCache).
 */
export function setRolloutPlan(log: ILogger, rolloutPlan: SplitIO.RolloutPlan, storage: { splits?: ISplitsCacheSync, rbSegments?: IRBSegmentsCacheSync, segments: ISegmentsCacheSync, largeSegments?: ISegmentsCacheSync }, matchingKey?: string) {
  // Do not load data if current rollout plan is empty
  if (Object.keys(rolloutPlan).length === 0) return;

  const { splits, rbSegments, segments, largeSegments } = storage;

  log.debug(`storage: set feature flags and segments${matchingKey ? ` for key ${matchingKey}` : ''}`);

  if (splits) {
    splits.clear();
    splits.update(rolloutPlan.flags as ISplit[] || [], [], rolloutPlan.since || -1);
  }

  if (rbSegments) {
    rbSegments.clear();
    rbSegments.update(rolloutPlan.rbSegments as IRBSegment[] || [], [], rolloutPlan.rbSince || -1);
  }

  const segmentsData = rolloutPlan.segments || {};
  if (matchingKey) { // add memberships data (client-side)
    let memberships = rolloutPlan.memberships && rolloutPlan.memberships[matchingKey];
    if (!memberships && segmentsData) {
      memberships = {
        ms: {
          k: Object.keys(segmentsData).filter(segmentName => {
            const segmentKeys = segmentsData[segmentName];
            return segmentKeys.indexOf(matchingKey) > -1;
          }).map(segmentName => ({ n: segmentName }))
        }
      };
    }

    if (memberships) {
      if ((memberships as IMembershipsResponse).ms) segments.resetSegments((memberships as IMembershipsResponse).ms!);
      if ((memberships as IMembershipsResponse).ls && largeSegments) largeSegments.resetSegments((memberships as IMembershipsResponse).ls!);
    }
  } else { // add segments data (server-side)
    Object.keys(segmentsData).forEach(segmentName => {
      const segmentKeys = segmentsData[segmentName];
      segments.update(segmentName, segmentKeys, [], -1);
    });
  }
}

/**
 * Gets the rollout plan snapshot from the given synchronous storage.
 * If `keys` are provided, the memberships for those keys is returned, to protect segments data.
 * Otherwise, the segments data is returned.
 */
export function getRolloutPlan(log: ILogger, storage: IStorageSync, keys?: SplitIO.SplitKey[]): SplitIO.RolloutPlan {

  log.debug(`storage: get feature flags and segments${keys ? ` for keys ${keys}` : ''}`);

  return {
    since: storage.splits.getChangeNumber(),
    flags: storage.splits.getAll(),
    rbSince: storage.rbSegments.getChangeNumber(),
    rbSegments: storage.rbSegments.getAll(),
    segments: keys ?
      undefined : // @ts-ignore accessing private prop
      Object.keys(storage.segments.segmentCache).reduce((prev, cur) => { // @ts-ignore accessing private prop
        prev[cur] = setToArray(storage.segments.segmentCache[cur] as Set<string>);
        return prev;
      }, {}),
    memberships: keys ?
      keys.reduce<Record<string, IMembershipsResponse>>((prev, key) => {
        if (storage.shared) {
          // Client-side segments
          // @ts-ignore accessing private prop
          const sharedStorage = storage.shared(key);
          prev[getMatching(key)] = {
            ms: {
              // @ts-ignore accessing private prop
              k: Object.keys(sharedStorage.segments.segmentCache).map(segmentName => ({ n: segmentName })),
            },
            ls: sharedStorage.largeSegments ? {
              // @ts-ignore accessing private prop
              k: Object.keys(sharedStorage.largeSegments.segmentCache).map(segmentName => ({ n: segmentName })),
            } : undefined
          };
        } else {
          prev[getMatching(key)] = {
            ms: {
              // Server-side segments
              // @ts-ignore accessing private prop
              k: Object.keys(storage.segments.segmentCache).reduce<IMySegmentsResponse['k']>((prev, segmentName) => { // @ts-ignore accessing private prop
                return storage.segments.segmentCache[segmentName].has(key) ?
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
