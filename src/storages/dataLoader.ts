import { SplitIO } from '../types';
import { ISegmentsCacheSync, ISplitsCacheSync, IStorageSync } from './types';
import { setToArray, ISet } from '../utils/lang/sets';

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
export function loadData(preloadedData: SplitIO.PreloadedData, storage: { splits?: ISplitsCacheSync, segments: ISegmentsCacheSync, largeSegments?: ISegmentsCacheSync }, userKey?: string) {
  // Do not load data if current preloadedData is empty
  if (Object.keys(preloadedData).length === 0) return;

  const { segmentsData = {}, since = -1, splitsData = {} } = preloadedData;

  if (storage.splits) {
    const storedSince = storage.splits.getChangeNumber();

    // Do not load data if current data is more recent
    if (storedSince > since) return;

    // cleaning up the localStorage data, since some cached splits might need be part of the preloaded data
    storage.splits.clear();
    storage.splits.setChangeNumber(since);

    // splitsData in an object where the property is the split name and the pertaining value is a stringified json of its data
    storage.splits.addSplits(Object.keys(splitsData).map(splitName => ([splitName, splitsData[splitName]])));
  }

  if (userKey) { // add mySegments data (client-side)
    let mySegmentsData = preloadedData.mySegmentsData && preloadedData.mySegmentsData[userKey];
    if (!mySegmentsData) {
      // segmentsData in an object where the property is the segment name and the pertaining value is a stringified object that contains the `added` array of userIds
      mySegmentsData = Object.keys(segmentsData).filter(segmentName => {
        const userKeys = segmentsData[segmentName];
        return userKeys.indexOf(userKey) > -1;
      });
    }
    storage.segments.resetSegments({ k: mySegmentsData.map(s => ({ n: s })) });
  } else { // add segments data (server-side)
    Object.keys(segmentsData).filter(segmentName => {
      const userKeys = segmentsData[segmentName];
      storage.segments.addToSegment(segmentName, userKeys);
    });
  }
}

export function getSnapshot(storage: IStorageSync, userKeys?: string[]): SplitIO.PreloadedData {
  return {
    // lastUpdated: Date.now(),
    // @ts-ignore accessing private prop
    since: storage.splits.changeNumber, // @ts-ignore accessing private prop
    splitsData: storage.splits.splitsCache,
    segmentsData: userKeys ?
      undefined : // @ts-ignore accessing private prop
      Object.keys(storage.segments.segmentCache).reduce((prev, cur) => { // @ts-ignore accessing private prop
        prev[cur] = setToArray(storage.segments.segmentCache[cur] as ISet<string>);
        return prev;
      }, {}),
    mySegmentsData: userKeys ?
      userKeys.reduce((prev, userKey) => {
        // @ts-ignore accessing private prop
        prev[userKey] = storage.shared ?
          // Client-side segments
          // @ts-ignore accessing private prop
          Object.keys(storage.shared(userKey).segments.segmentCache) :
          // Server-side segments
          // @ts-ignore accessing private prop
          Object.keys(storage.segments.segmentCache).reduce<string[]>((prev, segmentName) => { // @ts-ignore accessing private prop
            return storage.segments.segmentCache[segmentName].has(userKey) ?
              prev.concat(segmentName) :
              prev;
          }, []);
        return prev;
      }, {}) :
      undefined
  };
}
