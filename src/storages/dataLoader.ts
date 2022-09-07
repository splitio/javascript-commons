import { SplitIO } from '../types';
import { DEFAULT_CACHE_EXPIRATION_IN_MILLIS } from '../utils/constants/browser';
import { DataLoader, ISegmentsCacheSync, ISplitsCacheSync } from './types';

/**
 * Factory of client-side storage loader
 *
 * @param preloadedData validated data following the format proposed in https://github.com/godaddy/split-javascript-data-loader
 * and extended with a `mySegmentsData` property.
 * @returns function to preload the storage
 */
export function dataLoaderFactory(preloadedData: SplitIO.PreloadedData): DataLoader {

  /**
   * Storage-agnostic adaptation of `loadDataIntoLocalStorage` function
   * (https://github.com/godaddy/split-javascript-data-loader/blob/master/src/load-data.js)
   *
   * @param storage object containing `splits` and `segments` cache (client-side variant)
   * @param userId user key string of the provided MySegmentsCache
   *
   * @TODO extend to support SegmentsCache (server-side variant) by making `userId` optional and adding the corresponding logic.
   * @TODO extend to load data on shared mySegments storages. Be specific when emitting SDK_READY_FROM_CACHE on shared clients. Maybe the serializer should provide the `useSegments` flag.
   */
  return function loadData(storage: { splits: ISplitsCacheSync, segments: ISegmentsCacheSync }, userId: string) {
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

    // add mySegments data
    let mySegmentsData = preloadedData.mySegmentsData && preloadedData.mySegmentsData[userId];
    if (!mySegmentsData) {
      // segmentsData in an object where the property is the segment name and the pertaining value is a stringified object that contains the `added` array of userIds
      mySegmentsData = Object.keys(segmentsData).filter(segmentName => {
        const userIds = JSON.parse(segmentsData[segmentName]).added;
        return Array.isArray(userIds) && userIds.indexOf(userId) > -1;
      });
    }
    storage.segments.resetSegments(mySegmentsData);
  };
}
