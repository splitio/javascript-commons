import { IMySegmentsFetcher } from '../fetchers/types';
import { IStorageSync } from '../../../storages/types';
import { ISegmentsEventEmitter } from '../../../readiness/types';
import { timeout } from '../../../utils/promise/timeout';
import { SDK_SEGMENTS_ARRIVED, SEGMENTS_UPDATE } from '../../../readiness/constants';
import { ILogger } from '../../../logger/types';
import { SYNC_MYSEGMENTS_FETCH_RETRY } from '../../../logger/constants';
import { MySegmentsData } from '../types';
import { IMembershipsResponse } from '../../../dtos/types';
import { MEMBERSHIPS_LS_UPDATE } from '../../streaming/constants';
import { usesSegmentsSync } from '../../../storages/AbstractSplitsCacheSync';

type IMySegmentsUpdater = (segmentsData?: MySegmentsData, noCache?: boolean, till?: number) => Promise<boolean>

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

  const { segments, largeSegments } = storage;
  let readyOnAlreadyExistentState = true;
  let startingUp = true;

  /** timeout and telemetry decorator for `splitChangesFetcher` promise  */
  function _promiseDecorator<T>(promise: Promise<T>) {
    if (startingUp) promise = timeout(requestTimeoutBeforeReady, promise);
    return promise;
  }

  // @TODO if allowing pluggable storages, handle async execution
  function updateSegments(segmentsData: IMembershipsResponse | MySegmentsData) {

    let shouldNotifyUpdate;
    if ((segmentsData as MySegmentsData).type !== undefined) {
      shouldNotifyUpdate = (segmentsData as MySegmentsData).type === MEMBERSHIPS_LS_UPDATE ?
        largeSegments!.resetSegments(segmentsData as MySegmentsData) :
        segments.resetSegments(segmentsData as MySegmentsData);
    } else {
      shouldNotifyUpdate = segments.resetSegments((segmentsData as IMembershipsResponse).ms || {});
      shouldNotifyUpdate = largeSegments!.resetSegments((segmentsData as IMembershipsResponse).ls || {}) || shouldNotifyUpdate;
    }

    if (storage.save) storage.save();

    // Notify update if required
    if (usesSegmentsSync(storage) && (shouldNotifyUpdate || readyOnAlreadyExistentState)) {
      readyOnAlreadyExistentState = false;
      segmentsEventEmitter.emit(SDK_SEGMENTS_ARRIVED, { type: SEGMENTS_UPDATE, names: [] });
    }
  }

  function _mySegmentsUpdater(retry: number, segmentsData?: MySegmentsData, noCache?: boolean, till?: number): Promise<boolean> {
    const updaterPromise: Promise<boolean> = segmentsData ?
      // If segmentsData is provided, there is no need to fetch mySegments
      new Promise((res) => { updateSegments(segmentsData); res(true); }) :
      // If not provided, fetch mySegments
      mySegmentsFetcher(matchingKey, noCache, till, _promiseDecorator).then(segments => {
        updateSegments(segments);

        // Only when we have downloaded and stored segments completely, we should not keep retrying anymore
        startingUp = false;
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
   * @param segmentsData - it can be:
   *  (1) the list of mySegments names to sync in the storage,
   *  (2) an object with a segment name and action (true: add, or false: delete) to update the storage,
   *  (3) or `undefined`, for which the updater will fetch mySegments in order to sync the storage.
   * @param noCache - true to revalidate data to fetch
   * @param till - query param to bypass CDN requests
   */
  return function mySegmentsUpdater(segmentsData?: MySegmentsData, noCache?: boolean, till?: number) {
    return _mySegmentsUpdater(0, segmentsData, noCache, till);
  };

}
