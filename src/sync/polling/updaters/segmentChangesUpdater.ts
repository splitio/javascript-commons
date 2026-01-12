import { ISegmentChangesFetcher } from '../fetchers/types';
import { ISegmentsCacheBase } from '../../../storages/types';
import { IReadinessManager } from '../../../readiness/types';
import { SDK_SEGMENTS_ARRIVED } from '../../../readiness/constants';
import { ILogger } from '../../../logger/types';
import { LOG_PREFIX_INSTANTIATION, LOG_PREFIX_SYNC_SEGMENTS } from '../../../logger/constants';
import { timeout } from '../../../utils/promise/timeout';
import { SdkUpdateMetadata, SdkUpdateMetadataKeys } from '../../../../types/splitio';


type ISegmentChangesUpdater = (fetchOnlyNew?: boolean, segmentName?: string, noCache?: boolean, till?: number) => Promise<boolean>

/**
 * Factory of SegmentChanges updater, a task that:
 *  - fetches segment changes using `segmentChangesFetcher`
 *  - updates `segmentsCache`
 *  - uses `segmentsEventEmitter` to emit events related to segments data updates
 *
 * @param log - logger instance
 * @param segmentChangesFetcher - fetcher of `/segmentChanges`
 * @param segments - segments storage, with sync or async methods
 * @param readiness - optional readiness manager. Not required for synchronizer or producer mode.
 */
export function segmentChangesUpdaterFactory(
  log: ILogger,
  segmentChangesFetcher: ISegmentChangesFetcher,
  segments: ISegmentsCacheBase,
  readiness?: IReadinessManager,
  requestTimeoutBeforeReady?: number,
  retriesOnFailureBeforeReady?: number,
): ISegmentChangesUpdater {

  let readyOnAlreadyExistentState = true;

  function _promiseDecorator<T>(promise: Promise<T>) {
    if (readyOnAlreadyExistentState && requestTimeoutBeforeReady) promise = timeout(requestTimeoutBeforeReady, promise);
    return promise;
  }

  function updateSegment(segmentName: string, noCache?: boolean, till?: number, fetchOnlyNew?: boolean, retries?: number): Promise<boolean> {
    log.debug(`${LOG_PREFIX_SYNC_SEGMENTS}Processing segment ${segmentName}`);
    let sincePromise = Promise.resolve(segments.getChangeNumber(segmentName));

    return sincePromise.then(since => {
      // if fetchOnlyNew flag, avoid processing already fetched segments
      return fetchOnlyNew && since !== undefined ?
        false :
        segmentChangesFetcher(since || -1, segmentName, noCache, till, _promiseDecorator).then((changes) => {
          return Promise.all(changes.map(x => {
            log.debug(`${LOG_PREFIX_SYNC_SEGMENTS}Processing ${segmentName} with till = ${x.till}. Added: ${x.added.length}. Removed: ${x.removed.length}`);
            return segments.update(segmentName, x.added, x.removed, x.till);
          })).then((updates) => {
            return updates.some(update => update);
          });
        }).catch(error => {
          if (retries) {
            log.warn(`${LOG_PREFIX_SYNC_SEGMENTS}Retrying fetch of segment ${segmentName} (attempt #${retries}). Reason: ${error}`);
            return updateSegment(segmentName, noCache, till, fetchOnlyNew, retries - 1);
          }
          throw error;
        });
    });
  }
  /**
   * Segments updater returns a promise that resolves with a `false` boolean value if it fails at least to fetch a segment or synchronize it with the storage.
   * Thus, a false result doesn't imply that SDK_SEGMENTS_ARRIVED was not emitted.
   * Returned promise will not be rejected.
   *
   * @param fetchOnlyNew - if true, only fetch the segments that not exists, i.e., which `changeNumber` is equal to -1.
   * This param is used by SplitUpdateWorker on server-side SDK, to fetch new registered segments on SPLIT_UPDATE or RB_SEGMENT_UPDATE notifications.
   * @param segmentName - segment name to fetch. By passing `undefined` it fetches the list of segments registered at the storage
   * @param noCache - true to revalidate data to fetch on a SEGMENT_UPDATE notifications.
   * @param till - till target for the provided segmentName, for CDN bypass.
   */
  return function segmentChangesUpdater(fetchOnlyNew?: boolean, segmentName?: string, noCache?: boolean, till?: number) {
    log.debug(`${LOG_PREFIX_SYNC_SEGMENTS}Started segments update`);

    // If not a segment name provided, read list of available segments names to be updated.
    let segmentsPromise = Promise.resolve(segmentName ? [segmentName] : segments.getRegisteredSegments());

    return segmentsPromise.then(segmentNames => {
      const updaters = segmentNames.map(segmentName => updateSegment(segmentName, noCache, till, fetchOnlyNew, readyOnAlreadyExistentState ? retriesOnFailureBeforeReady : 0));

      return Promise.all(updaters).then(shouldUpdateFlags => {
        // if at least one segment fetch succeeded, mark segments ready
        if (shouldUpdateFlags.some(update => update) || readyOnAlreadyExistentState) {
          readyOnAlreadyExistentState = false;
          const metadata: SdkUpdateMetadata = {
            type: SdkUpdateMetadataKeys.SEGMENTS_UPDATE,
            names: []
          };
          if (readiness) readiness.segments.emit(SDK_SEGMENTS_ARRIVED, metadata);
        }
        return true;
      });
    })
      // Handles rejected promises at `segmentChangesFetcher`, `segments.getRegisteredSegments` and other segment storage operations.
      .catch(error => {
        if (error && error.statusCode === 403) {
          // If the operation is forbidden, it may be due to permissions. Destroy the SDK instance.
          // @TODO although factory status is destroyed, synchronization is not stopped
          if (readiness) readiness.setDestroyed();
          log.error(`${LOG_PREFIX_INSTANTIATION}: you passed a client-side type authorizationKey, please grab an SDK Key from the Split user interface that is of type server-side.`);
        } else {
          log.warn(`${LOG_PREFIX_SYNC_SEGMENTS}Error while doing fetch of segments. ${error}`);
        }

        return false;
      });
  };
}
