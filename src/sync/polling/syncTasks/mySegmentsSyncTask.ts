import { IMySegmentsFetcher } from '../fetchers/types';
import { ISegmentsCacheSync, ISplitsCacheSync, IStorageSync } from '../../../storages/types';
import { IReadinessManager, ISegmentsEventEmitter } from '../../../readiness/types';
import { SplitError } from '../../../utils/lang/errors';
import timeout from '../../../utils/promise/timeout';
import syncTaskFactory from '../../syncTask';
import { ISegmentsSyncTask } from '../types';
import { IFetchMySegments } from '../../../services/types';
import mySegmentsFetcherFactory from '../fetchers/mySegmentsFetcher';
import { ISettings } from '../../../types';
import { SDK_SEGMENTS_ARRIVED } from '../../../readiness/constants';
import { ILogger } from '../../../logger/types';
import { SYNC_MYSEGMENTS_FETCH_RETRY } from '../../../logger/constants';

type IMySegmentsUpdater = (segmentList?: string[], noCache?: boolean) => Promise<boolean>

/**
 * factory of MySegments updater (a.k.a, SegmentsSyncTask), a task that:
 *  - fetches mySegments using `mySegmentsFetcher`
 *  - updates `mySegmentsCache`
 *  - uses `segmentsEventEmitter` to emit events related to segments data updates
 */
function mySegmentsUpdaterFactory(
  log: ILogger,
  mySegmentsFetcher: IMySegmentsFetcher,
  splitsCache: ISplitsCacheSync,
  mySegmentsCache: ISegmentsCacheSync,
  segmentsEventEmitter: ISegmentsEventEmitter,
  requestTimeoutBeforeReady: number,
  retriesOnFailureBeforeReady: number,
): IMySegmentsUpdater {

  let readyOnAlreadyExistentState = true;
  let startingUp = true;

  /** timeout and telemetry decorator for `splitChangesFetcher` promise  */
  function _promiseDecorator(promise: Promise<Response>) {
    if (startingUp) promise = timeout(requestTimeoutBeforeReady, promise);
    return promise;

    // @TODO telemetry
    // NOTE: We only collect metrics on startup.
    // mySegmentsPromise = tracker.start(tracker.TaskNames.MY_SEGMENTS_FETCH, startingUp ? metricCollectors : false, mySegmentsPromise);
  }

  // @TODO if allowing custom storages, handle async execution and wrap errors as SplitErrors to distinguish from user callback errors
  function updateSegments(segments: string[]) {
    // Update the list of segment names available
    const shouldNotifyUpdate = mySegmentsCache.resetSegments(segments);

    // Notify update if required
    if (splitsCache.usesSegments() && (shouldNotifyUpdate || readyOnAlreadyExistentState)) {
      readyOnAlreadyExistentState = false;
      segmentsEventEmitter.emit(SDK_SEGMENTS_ARRIVED);
    }
  }

  function _mySegmentsUpdater(retry: number, segmentList?: string[], noCache?: boolean): Promise<boolean> {
    const updaterPromise: Promise<boolean> = segmentList ?
      // If segmentList is provided, there is no need to fetch mySegments
      new Promise((res) => { updateSegments(segmentList); res(true); }) :
      // If not provided, fetch mySegments
      mySegmentsFetcher(noCache, _promiseDecorator).then(segments => {
        // Only when we have downloaded segments completely, we should not keep retrying anymore
        startingUp = false;

        updateSegments(segments);
        return true;
      });

    return updaterPromise.catch(error => {
      // handle user callback errors
      if (!(error instanceof SplitError)) setTimeout(() => { throw error; }, 0);

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
   *
   * @param {string[] | undefined} segmentList list of mySegments names to sync in the storage. If the list is `undefined`, it fetches them before syncing in the storage.
   * @param {boolean | undefined} noCache true to revalidate data to fetch
   */
  return function mySegmentsUpdater(segmentList?: string[], noCache?: boolean) {
    return _mySegmentsUpdater(0, segmentList, noCache);
  };

}

export default function mySegmentsSyncTaskFactory(
  fetchMySegments: IFetchMySegments,
  storage: IStorageSync,
  readiness: IReadinessManager,
  settings: ISettings,
  matchingKey: string
): ISegmentsSyncTask {
  return syncTaskFactory(
    settings.log,
    mySegmentsUpdaterFactory(
      settings.log,
      mySegmentsFetcherFactory(fetchMySegments, matchingKey),
      storage.splits,
      storage.segments,
      readiness.segments,
      settings.startup.requestTimeoutBeforeReady,
      settings.startup.retriesOnFailureBeforeReady,
    ),
    settings.scheduler.segmentsRefreshRate,
    'mySegmentsUpdater',
  );
}
