import SplitIO from '../../types/splitio';
import { IStorageSync } from './types';
import { setToArray } from '../utils/lang/sets';
import { getMatching } from '../utils/key';
import { ILogger } from '../logger/types';
import { RolloutPlan } from './types';
import { IMembershipsResponse, IMySegmentsResponse } from '../dtos/types';

/**
 * Gets the rollout plan snapshot from the given synchronous storage.
 */
export function getRolloutPlan(log: ILogger, storage: IStorageSync, options: SplitIO.RolloutPlanOptions = {}): RolloutPlan {

  const { keys, exposeSegments } = options;
  const { splits, segments, rbSegments } = storage;

  log.debug(`storage: get feature flags${keys ? `, and memberships for keys: ${keys}` : ''}${exposeSegments ? ', and segments' : ''}`);

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
        since: -1,
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
