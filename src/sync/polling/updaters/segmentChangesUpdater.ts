import { ISegmentChangesFetcher } from '../fetchers/types';
import { ISegmentsCacheBase } from '../../../storages/types';
import { IReadinessManager } from '../../../readiness/types';
import { MaybeThenable } from '../../../dtos/types';
import { findIndex } from '../../../utils/lang';
import { SDK_SEGMENTS_ARRIVED } from '../../../readiness/constants';
import { ILogger } from '../../../logger/types';
import { LOG_PREFIX_INSTANTIATION, LOG_PREFIX_SYNC_SEGMENTS } from '../../../logger/constants';
import { thenable } from '../../../utils/promise/thenable';
import { ISyncTask } from '../../types';
import { syncTaskFactory } from '../../syncTask';

type ISegmentChangesUpdater = {
  updateSegment(segmentName: string): ISyncTask<[noCache?: boolean, fetchOnlyIfNew?: boolean, till?: number], number>
  updateSegments(fetchOnlyNew?: boolean): Promise<boolean>,
}

/**
 * Factory of SegmentChanges updater, a task that:
 *  - fetches segment changes using `segmentChangesFetcher`
 *  - updates `segmentsCache`
 *  - uses `segmentsEventEmitter` to emit events related to segments data updates
 *
 * @param log logger instance
 * @param segmentChangesFetcher fetcher of `/segmentChanges`
 * @param segments segments storage, with sync or async methods
 * @param readiness optional readiness manager. Not required for synchronizer or producer mode.
 */
export function segmentChangesUpdaterFactory(
  log: ILogger,
  segmentChangesFetcher: ISegmentChangesFetcher,
  segments: ISegmentsCacheBase,
  readiness?: IReadinessManager,
): ISegmentChangesUpdater {

  let readyOnAlreadyExistentState = true;

  function segmentChangesUpdater(segmentName: string, noCache?: boolean, fetchOnlyIfNew?: boolean, till?: number): Promise<number> {
    log.debug(`${LOG_PREFIX_SYNC_SEGMENTS}Processing segment ${segmentName}`);
    let sincePromise = Promise.resolve(segments.getChangeNumber(segmentName));

    return sincePromise.then(since => {
      // if fetchOnlyNew flag, avoid processing already fetched segments
      if (fetchOnlyIfNew && since !== -1) return -1;

      return segmentChangesFetcher(since, segmentName, noCache, till).then(function (changes) {
        let changeNumber = -1;
        const results: MaybeThenable<boolean | void>[] = [];
        changes.forEach(x => {
          if (x.added.length > 0) results.push(segments.addToSegment(segmentName, x.added));
          if (x.removed.length > 0) results.push(segments.removeFromSegment(segmentName, x.removed));
          if (x.added.length > 0 || x.removed.length > 0) {
            results.push(segments.setChangeNumber(segmentName, x.till));
            changeNumber = x.till;
          }

          log.debug(`${LOG_PREFIX_SYNC_SEGMENTS}Processed ${segmentName} with till = ${x.till}. Added: ${x.added.length}. Removed: ${x.removed.length}`);
        });
        // If at least one storage operation result is a promise, join all in a single promise.
        if (results.some(result => thenable(result))) return Promise.all(results).then(() => changeNumber);
        return changeNumber;
      });
    });
  }

  const segmentsTasks: Record<string, ISyncTask<[noCache?: boolean, fetchOnlyIfNew?: boolean, till?: number], number>> = {};

  function updateSegment(segmentName: string) {
    return (segmentsTasks[segmentName] = segmentsTasks[segmentName] || syncTaskFactory(log /* @TODO dummy log */, segmentChangesUpdater.bind(null, segmentName)));
  }

  return {
    /**
     * Used by SegmentsUpdateWorker to update single segments (SEGMENT_UPDATE events).
     *
     * @param {string} segmentName segment to fetch.
     * @param {boolean | undefined} noCache true to revalidate data to fetch on a SEGMENT_UPDATE notifications.
     * @param {boolean | undefined} fetchOnlyIfNew if true, only fetch the segment if it doesn't exists (changeNumber is -1).
     * @param {number | undefined} till till target for the provided segmentName, for CDN bypass.
     */
    updateSegment,

    /**
     * Used by pollingManager to update all segments on syncAll and periodic fetch, and by SplitsUpdateWorker to update new segments.
     * Returns a promise that never rejects, and resolves with a `false` boolean value if it fails to fetch a segment or synchronize it with the storage.
     *
     * @param {boolean | undefined} fetchOnlyNew if true, only fetch the segments that not exists (changeNumber is -1).
     * This param is used by SplitUpdateWorker on server-side SDK, to fetch new registered segments on SPLIT_UPDATE notifications.
     */
    updateSegments(fetchOnlyNew?: boolean) {
      log.debug(`${LOG_PREFIX_SYNC_SEGMENTS}Started segments update`);

      // read list of available segments names to be updated.
      let segmentsPromise = Promise.resolve(segments.getRegisteredSegments());

      return segmentsPromise.then(segmentNames => {
        // Async fetchers are collected here.
        const updaters: Promise<number>[] = [];

        for (let index = 0; index < segmentNames.length; index++) {
          const segmentName = segmentNames[index];
          // if (!segmentsTasks[segmentName]) segmentsTasks[segmentName] = syncTaskFactory(log /* @TODO dummy log */, segmentChangesUpdater);
          updaters.push(updateSegment(segmentName).execute(undefined, fetchOnlyNew, undefined));
        }

        return Promise.all(updaters).then(shouldUpdateFlags => {
          // if at least one segment fetch succeeded, mark segments ready
          if (findIndex(shouldUpdateFlags, v => v !== -1) !== -1 || readyOnAlreadyExistentState) {
            readyOnAlreadyExistentState = false;
            if (readiness) readiness.segments.emit(SDK_SEGMENTS_ARRIVED);
          }
          return true;
        });
      })
        // Handles rejected promises at `segmentChangesFetcher`, `segments.getRegisteredSegments` and other segment storage operations.
        .catch(error => {
          if (error && error.statusCode === 403) {
            // If the operation is forbidden, it may be due to permissions. Destroy the SDK instance.
            // @TODO although factory status is destroyed, synchronization is not stopped
            if (readiness) readiness.destroy();
            log.error(`${LOG_PREFIX_INSTANTIATION}: you passed a client-side type authorizationKey, please grab an Api Key from the Split web console that is of type Server-side.`);
          } else {
            log.warn(`${LOG_PREFIX_SYNC_SEGMENTS}Error while doing fetch of segments. ${error}`);
          }

          return false;
        });
    }
  };
}
