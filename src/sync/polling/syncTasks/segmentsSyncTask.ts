import { ISegmentChangesFetcher } from '../fetchers/types';
import { ISegmentsCacheSync, IStorageSync } from '../../../storages/types';
import { IReadinessManager } from '../../../readiness/types';
import { ISegmentChangesResponse } from '../../../dtos/types';
import { findIndex } from '../../../utils/lang';
import { SplitError } from '../../../utils/lang/errors';
import syncTaskFactory from '../../syncTask';
import { ISegmentsSyncTask } from '../types';
import segmentChangesFetcherFactory from '../fetchers/segmentChangesFetcher';
import { IFetchSegmentChanges } from '../../../services/types';
import { ISettings } from '../../../types';
import { SDK_SEGMENTS_ARRIVED } from '../../../readiness/constants';
import { ILogger } from '../../../logger/types';
// import { logFactory } from '../../../logger/sdkLogger';
// const log = logFactory('splitio-sync:segment-changes');

type ISegmentChangesUpdater = (segmentNames?: string[], noCache?: boolean, fetchOnlyNew?: boolean) => Promise<boolean>

/**
 * factory of SegmentChanges updater (a.k.a, SegmentsSyncTask), a task that:
 *  - fetches segment changes using `segmentChangesFetcher`
 *  - updates `segmentsCache`
 *  - uses `segmentsEventEmitter` to emit events related to segments data updates
 */
function segmentChangesUpdaterFactory(
  log: ILogger,
  segmentChangesFetcher: ISegmentChangesFetcher,
  segmentsCache: ISegmentsCacheSync,
  readiness: IReadinessManager,
): ISegmentChangesUpdater {

  let readyOnAlreadyExistentState = true;

  /** telemetry decorator for `segmentChangesFetcher` promise  */
  function _promiseDecorator(promise: Promise<ISegmentChangesResponse[]>) {
    return promise;
    // @TODO handle telemetry?
    // const collectMetrics = startingUp || isNode; // If we are on the browser, only collect this metric for first fetch. On node do it always.
    // splitsPromise = tracker.start(tracker.TaskNames.SPLITS_FETCH, collectMetrics ? metricCollectors : false, splitsPromise);
  }

  /**
   * Segments updater returns a promise that resolves with a `false` boolean value if it fails at least to fetch a segment or synchronize it with the storage.
   * Thus, a false result doesn't imply that SDK_SEGMENTS_ARRIVED was not emitted.
   *
   * @param {string[] | undefined} segmentNames list of segment names to fetch. By passing `undefined` it fetches the list of segments registered at the storage
   * @param {boolean | undefined} noCache true to revalidate data to fetch on a SEGMENT_UPDATE notifications.
   * @param {boolean | undefined} fetchOnlyNew if true, only fetch the segments that not exists, i.e., which `changeNumber` is equal to -1.
   * This param is used by SplitUpdateWorker on server-side SDK, to fetch new registered segments on SPLIT_UPDATE notifications.
   */
  return function segmentChangesUpdater(segmentNames?: string[], noCache?: boolean, fetchOnlyNew?: boolean) {
    log.debug('Started segments update');

    // If not a segment name provided, read list of available segments names to be updated.
    let segments = segmentNames ? segmentNames : segmentsCache.getRegisteredSegments();
    if (fetchOnlyNew) segments = segments.filter(segmentName => segmentsCache.getChangeNumber(segmentName) === -1);

    // Async fetchers are collected here.
    const updaters: Promise<number>[] = [];

    for (let index = 0; index < segments.length; index++) {
      const segmentName = segments[index];
      const since = segmentsCache.getChangeNumber(segmentName);

      log.debug(`Processing segment ${segmentName}`);

      updaters.push(segmentChangesFetcher(since, segmentName, noCache, _promiseDecorator).then(function (changes) {
        let changeNumber = -1;
        changes.forEach(x => {
          if (x.added.length > 0) segmentsCache.addToSegment(segmentName, x.added);
          if (x.removed.length > 0) segmentsCache.removeFromSegment(segmentName, x.removed);
          if (x.added.length > 0 || x.removed.length > 0) {
            segmentsCache.setChangeNumber(segmentName, x.till);
            changeNumber = x.till;
          }

          log.debug(`Processed ${segmentName} with till = ${x.till}. Added: ${x.added.length}. Removed: ${x.removed.length}`);
        });

        return changeNumber;
      }));

    }

    return Promise.all(updaters).then(shouldUpdateFlags => {
      // if at least one segment fetch successes, mark segments ready
      if (findIndex(shouldUpdateFlags, v => v !== -1) !== -1 || readyOnAlreadyExistentState) {
        readyOnAlreadyExistentState = false;
        readiness.segments.emit(SDK_SEGMENTS_ARRIVED);
      }
      // if at least one segment fetch fails, return false to indicate that there was some error (e.g., invalid json, HTTP error, etc)
      if (shouldUpdateFlags.indexOf(-1) !== -1) return false;
      return true;
    }).catch(error => {
      // handle user callback errors
      if (!(error instanceof SplitError)) setTimeout(() => { throw error; }, 0);

      if (error.statusCode === 403) {
        // @TODO although factory status is destroyed, synchronization is not stopped
        readiness.destroy();
        log.error('Factory instantiation: you passed a Browser type authorizationKey, please grab an Api Key from the Split web console that is of type SDK.');
      }

      return false;
    });
  };

}

export default function segmentsSyncTaskFactory(
  fetchSegmentChanges: IFetchSegmentChanges,
  storage: IStorageSync,
  readiness: IReadinessManager,
  settings: ISettings,
): ISegmentsSyncTask {
  return syncTaskFactory(
    settings.log,
    segmentChangesUpdaterFactory(
      settings.log,
      segmentChangesFetcherFactory(fetchSegmentChanges),
      storage.segments,
      readiness,
    ),
    settings.scheduler.segmentsRefreshRate,
    'segmentChangesUpdater'
  );
}
