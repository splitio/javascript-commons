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
import { ILogger } from '../../../logger/types';
// import { logFactory } from '../../../logger/sdkLogger';
// const log = logFactory('splitio-sync:segment-changes');
// const inputValidationLog = logFactory('', { displayAllErrors: true });

type ISegmentChangesUpdater = (segmentNames?: string[]) => Promise<boolean>

/**
 * factory of SegmentChanges updater (a.k.a, SegmentsSyncTask), a task that:
 *  - fetches segment changes using `segmentChangesFetcher`
 *  - updates `segmentsCache`
 *  - uses `segmentsEventEmitter` to emit events related to segments data updates
 */
function segmentChangesUpdaterFactory(
  segmentChangesFetcher: ISegmentChangesFetcher,
  segmentsCache: ISegmentsCacheSync,
  readiness: IReadinessManager,
  log: ILogger
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
   */
  return function segmentChangesUpdater(segmentNames?: string[]) {
    log.d('Started segments update');

    // If not a segment name provided, read list of available segments names to be updated.
    if (!segmentNames) segmentNames = segmentsCache.getRegisteredSegments();

    // Async fetchers are collected here.
    const updaters: Promise<number>[] = [];

    for (let index = 0; index < segmentNames.length; index++) {
      const segmentName = segmentNames[index];
      const since = segmentsCache.getChangeNumber(segmentName);

      log.d(`Processing segment ${segmentName}`);

      updaters.push(segmentChangesFetcher(since, segmentName, _promiseDecorator).then(function (changes) {
        let changeNumber = -1;
        changes.forEach(x => {
          if (x.added.length > 0) segmentsCache.addToSegment(segmentName, x.added);
          if (x.removed.length > 0) segmentsCache.removeFromSegment(segmentName, x.removed);
          if (x.added.length > 0 || x.removed.length > 0) {
            segmentsCache.setChangeNumber(segmentName, x.till);
            changeNumber = x.till;
          }

          log.d(`Processed ${segmentName} with till = ${x.till}. Added: ${x.added.length}. Removed: ${x.removed.length}`);
        });

        return changeNumber;
      }));

    }

    return Promise.all(updaters).then(shouldUpdateFlags => {
      // if at least one segment fetch successes, mark segments ready
      if (findIndex(shouldUpdateFlags, v => v !== -1) !== -1 || readyOnAlreadyExistentState) {
        readyOnAlreadyExistentState = false;
        readiness.segments.emit('SDK_SEGMENTS_ARRIVED');
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
        log.e('Factory instantiation: you passed a Browser type authorizationKey, please grab an Api Key from the Split web console that is of type SDK.');
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
    segmentChangesUpdaterFactory(
      segmentChangesFetcherFactory(fetchSegmentChanges),
      storage.segments,
      readiness,
      settings.log
    ),
    settings.scheduler.segmentsRefreshRate,
    'segmentChangesUpdater',
    settings.log
  );
}
