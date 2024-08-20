import { IMySegmentsFetcher } from '../fetchers/types';
import { IStorageSync } from '../../../storages/types';
import { ISegmentsEventEmitter } from '../../../readiness/types';
import { timeout } from '../../../utils/promise/timeout';
import { SDK_SEGMENTS_ARRIVED } from '../../../readiness/constants';
import { ILogger } from '../../../logger/types';
import { SYNC_MYSEGMENTS_FETCH_RETRY } from '../../../logger/constants';
import { MySegmentsData } from '../types';

type IMySegmentsUpdater = (segmentList?: MySegmentsData, noCache?: boolean) => Promise<boolean>

/**
 * factory of MySegments updater, a task that:
 *  - fetches mySegments using `mySegmentsFetcher`
 *  - updates `mySegmentsCache`
 *  - uses `segmentsEventEmitter` to emit events related to segments data updates
 */
export function mySegmentsUpdaterFactory(
  log: ILogger,
  mySegmentsFetcher: IMySegmentsFetcher,
  storage: IStorageSync,
  segmentsEventEmitter: ISegmentsEventEmitter,
  requestTimeoutBeforeReady: number,
  retriesOnFailureBeforeReady: number,
  matchingKey: string
): IMySegmentsUpdater {

  const { splits, segments, largeSegments } = storage;
  let readyOnAlreadyExistentState = true;
  let startingUp = true;

  /** timeout and telemetry decorator for `splitChangesFetcher` promise  */
  function _promiseDecorator<T>(promise: Promise<T>) {
    if (startingUp) promise = timeout(requestTimeoutBeforeReady, promise);
    return promise;
  }

  // @TODO if allowing pluggable storages, handle async execution
  function updateSegments(segmentsData: MySegmentsData) {

    let shouldNotifyUpdate;
    if (Array.isArray(segmentsData)) {
      // Add/Delete the segment names
      (segmentsData as { isLS?: boolean, name: string, add: boolean }[]).forEach(({ isLS, name, add }) => {
        const cache = isLS ? largeSegments : segments;
        if (cache!.isInSegment(name) !== add) {
          shouldNotifyUpdate = true;
          if (add) cache!.addToSegment(name);
          else cache!.removeFromSegment(name);
        }
      });
    } else {
      // Reset the list of segment names
      const mySegmentsUpdated = segments.resetSegments(segmentsData.mySegments.map((segment) => segment.name));
      const myLargeSegmentsUpdated = largeSegments!.resetSegments(segmentsData.myLargeSegments || []/*, segmentsData.till*/);
      shouldNotifyUpdate = mySegmentsUpdated || myLargeSegmentsUpdated;
    }

    // Notify update if required
    if (splits.usesSegments() && (shouldNotifyUpdate || readyOnAlreadyExistentState)) {
      readyOnAlreadyExistentState = false;
      segmentsEventEmitter.emit(SDK_SEGMENTS_ARRIVED);
    }
  }

  function _mySegmentsUpdater(retry: number, segmentsData?: MySegmentsData, noCache?: boolean): Promise<boolean> {
    const updaterPromise: Promise<boolean> = segmentsData ?
      // If segmentsData is provided, there is no need to fetch mySegments
      new Promise((res) => { updateSegments(segmentsData); res(true); }) :
      // If not provided, fetch mySegments
      mySegmentsFetcher(matchingKey, noCache, _promiseDecorator).then(segments => {
        // Only when we have downloaded segments completely, we should not keep retrying anymore
        startingUp = false;

        updateSegments(segments);
        return true;
      });

    return updaterPromise.catch(error => {
      if (startingUp && retriesOnFailureBeforeReady > retry) {
        retry += 1;
        log.warn(SYNC_MYSEGMENTS_FETCH_RETRY, [retry, error]);
        return _mySegmentsUpdater(retry); // no need to forward `segmentList` and `noCache` params
      } else {
        startingUp = false;
      }

      return false;
    });
  }

  /**
   * MySegments updater returns a promise that resolves with a `false` boolean value if it fails to fetch mySegments or synchronize them with the storage.
   * Returned promise will not be rejected.
   *
   * @param {SegmentsData | undefined} segmentsData it can be:
   *  (1) the list of mySegments names to sync in the storage,
   *  (2) an object with a segment name and action (true: add, or false: delete) to update the storage,
   *  (3) or `undefined`, for which the updater will fetch mySegments in order to sync the storage.
   * @param {boolean | undefined} noCache true to revalidate data to fetch
   */
  return function mySegmentsUpdater(segmentsData?: MySegmentsData, noCache?: boolean) {
    return _mySegmentsUpdater(0, segmentsData, noCache);
  };

}
