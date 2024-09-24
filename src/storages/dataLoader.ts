import { SplitIO } from '../types';
import { DEFAULT_CACHE_EXPIRATION_IN_MILLIS } from '../utils/constants/browser';
import { DataLoader, ISegmentsCacheSync, ISplitsCacheSync } from './types';

/**
 * Factory of storage loader
 *
 * @param preloadedData validated data following the format proposed in https://github.com/godaddy/split-javascript-data-loader
 * and extended with a `mySegmentsData` property.
 * @returns function to preload the storage
 */
export function DataLoaderFactory(preloadedData: SplitIO.PreloadedData): DataLoader {

  /**
   * Storage-agnostic adaptation of `loadDataIntoLocalStorage` function
   * (https://github.com/godaddy/split-javascript-data-loader/blob/master/src/load-data.js)
   *
   * @param storage object containing `splits` and `segments` cache (client-side variant)
   * @param userKey user key (matching key) of the provided MySegmentsCache
   *
   * @TODO extend to load data on shared mySegments storages. Be specific when emitting SDK_READY_FROM_CACHE on shared clients. Maybe the serializer should provide the `useSegments` flag.
   * @TODO add logs, and input validation in this module, in favor of size reduction.
   * @TODO unit tests
   */
  return function loadData(storage: { splits: ISplitsCacheSync, segments: ISegmentsCacheSync }, userKey?: string) {
    // Do not load data if current preloadedData is empty
    if (Object.keys(preloadedData).length === 0) return;

    const { lastUpdated = -1, segmentsData = {}, since = -1, splitsData = {} } = preloadedData;

    const storedSince = storage.splits.getChangeNumber();
    const expirationTimestamp = Date.now() - DEFAULT_CACHE_EXPIRATION_IN_MILLIS;

    // Do not load data if current localStorage data is more recent,
    // or if its `lastUpdated` timestamp is older than the given `expirationTimestamp`,
    if (storedSince > since || lastUpdated < expirationTimestamp) return;

    // cleaning up the localStorage data, since some cached splits might need be part of the preloaded data
    storage.splits.clear();
    storage.splits.setChangeNumber(since);

    // splitsData in an object where the property is the split name and the pertaining value is a stringified json of its data
    storage.splits.addSplits(Object.keys(splitsData).map(splitName => JSON.parse(splitsData[splitName])));

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
  };
}
