import { SplitIO } from '../types';
import { ISegmentsCacheSync, ISplitsCacheSync, IStorageSync } from './types';
import { setToArray } from '../utils/lang/sets';
import { getMatching } from '../utils/key';
import { IMembershipsResponse, IMySegmentsResponse } from '../dtos/types';

/**
 * Storage-agnostic adaptation of `loadDataIntoLocalStorage` function
 * (https://github.com/godaddy/split-javascript-data-loader/blob/master/src/load-data.js)
 *
 * @param preloadedData validated data following the format proposed in https://github.com/godaddy/split-javascript-data-loader and extended with a `mySegmentsData` property.
 * @param storage object containing `splits` and `segments` cache (client-side variant)
 * @param userKey user key (matching key) of the provided MySegmentsCache
 *
 * @TODO extend to load largeSegments
 * @TODO extend to load data on shared mySegments storages. Be specific when emitting SDK_READY_FROM_CACHE on shared clients. Maybe the serializer should provide the `useSegments` flag.
 * @TODO add logs, and input validation in this module, in favor of size reduction.
 * @TODO unit tests
 */
export function loadData(preloadedData: SplitIO.PreloadedData, storage: { splits?: ISplitsCacheSync, segments: ISegmentsCacheSync, largeSegments?: ISegmentsCacheSync }, matchingKey?: string) {
  // Do not load data if current preloadedData is empty
  if (Object.keys(preloadedData).length === 0) return;

  const { segmentsData = {}, since = -1, splitsData = [] } = preloadedData;

  if (storage.splits) {
    const storedSince = storage.splits.getChangeNumber();

    // Do not load data if current data is more recent
    if (storedSince > since) return;

    // cleaning up the localStorage data, since some cached splits might need be part of the preloaded data
    storage.splits.clear();
    storage.splits.setChangeNumber(since);

    // splitsData in an object where the property is the split name and the pertaining value is a stringified json of its data
    storage.splits.addSplits(splitsData.map(split => ([split.name, split])));
  }

  if (matchingKey) { // add mySegments data (client-side)
    let membershipsData = preloadedData.membershipsData && preloadedData.membershipsData[matchingKey];
    if (!membershipsData && segmentsData) {
      membershipsData = {
        ms: {
          k: Object.keys(segmentsData).filter(segmentName => {
            const segmentKeys = segmentsData[segmentName];
            return segmentKeys.indexOf(matchingKey) > -1;
          }).map(segmentName => ({ n: segmentName }))
        }
      };
    }
    if (membershipsData) {
      if (membershipsData.ms) storage.segments.resetSegments(membershipsData.ms);
      if (membershipsData.ls && storage.largeSegments) storage.largeSegments.resetSegments(membershipsData.ls);
    }

  } else { // add segments data (server-side)
    Object.keys(segmentsData).forEach(segmentName => {
      const segmentKeys = segmentsData[segmentName];
      storage.segments.update(segmentName, segmentKeys, [], -1);
    });
  }
}

export function getSnapshot(storage: IStorageSync, userKeys?: SplitIO.SplitKey[]): SplitIO.PreloadedData {
  return {
    // lastUpdated: Date.now(),
    since: storage.splits.getChangeNumber(),
    splitsData: storage.splits.getAll(),
    segmentsData: userKeys ?
      undefined : // @ts-ignore accessing private prop
      Object.keys(storage.segments.segmentCache).reduce((prev, cur) => { // @ts-ignore accessing private prop
        prev[cur] = setToArray(storage.segments.segmentCache[cur] as Set<string>);
        return prev;
      }, {}),
    membershipsData: userKeys ?
      userKeys.reduce<Record<string, IMembershipsResponse>>((prev, userKey) => {
        if (storage.shared) {
          // Client-side segments
          // @ts-ignore accessing private prop
          const sharedStorage = storage.shared(userKey);
          prev[getMatching(userKey)] = {
            ms: {
              // @ts-ignore accessing private prop
              k: Object.keys(sharedStorage.segments.segmentCache).map(segmentName => ({ n: segmentName })),
              // cn: sharedStorage.segments.getChangeNumber()
            },
            ls: sharedStorage.largeSegments ? {
              // @ts-ignore accessing private prop
              k: Object.keys(sharedStorage.largeSegments.segmentCache).map(segmentName => ({ n: segmentName })),
              // cn: sharedStorage.largeSegments.getChangeNumber()
            } : undefined
          };
        } else {
          prev[getMatching(userKey)] = {
            ms: {
              // Server-side segments
              // @ts-ignore accessing private prop
              k: Object.keys(storage.segments.segmentCache).reduce<IMySegmentsResponse['k']>((prev, segmentName) => { // @ts-ignore accessing private prop
                return storage.segments.segmentCache[segmentName].has(userKey) ?
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
