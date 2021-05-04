import { SplitError } from '../../../utils/lang/errors';
import { _Set, setToArray, ISet } from '../../../utils/lang/sets';
import { ISegmentsCacheSync, ISplitsCacheBase } from '../../../storages/types';
import { ISplitChangesFetcher } from '../fetchers/types';
import { ISplit, ISplitChangesResponse } from '../../../dtos/types';
import { ISplitsEventEmitter } from '../../../readiness/types';
import timeout from '../../../utils/promise/timeout';
import thenable from '../../../utils/promise/thenable';
import { SDK_SPLITS_ARRIVED, SDK_SPLITS_CACHE_LOADED } from '../../../readiness/constants';
import { ILogger } from '../../../logger/types';
import { SYNC_SPLITS_FETCH, SYNC_SPLITS_NEW, SYNC_SPLITS_REMOVED, SYNC_SPLITS_SEGMENTS, SYNC_SPLITS_FETCH_FAILS, SYNC_SPLITS_FETCH_RETRY } from '../../../logger/constants';

type ISplitChangesUpdater = (noCache?: boolean) => Promise<boolean>

// Checks that all registered segments have been fetched (changeNumber !== -1).
// @TODO review together with Segments and MySegments storage APIs
function checkAllSegmentsExist(segmentsStorage: ISegmentsCacheSync) {
  return segmentsStorage.getRegisteredSegments().every(segmentName => segmentsStorage.getChangeNumber(segmentName) !== -1);
}

/**
 * Collect segments from a raw split definition.
 * Exported for testing purposes.
 */
export function parseSegments({ conditions }: ISplit): ISet<string> {

  let segments = new _Set<string>();

  for (let i = 0; i < conditions.length; i++) {
    const matchers = conditions[i].matcherGroup.matchers;

    matchers.forEach(matcher => {
      if (matcher.matcherType === 'IN_SEGMENT') segments.add(matcher.userDefinedSegmentMatcherData.segmentName);
    });
  }

  return segments;
}

interface ISplitMutations {
  added: [string, string][],
  removed: string[],
  segments: string[]
}

/**
 * Given the list of splits from /splitChanges endpoint, it returns the mutations,
 * i.e., an object with added splits, removed splits and used segments.
 * Exported for testing purposes.
 */
export function computeSplitsMutation(entries: ISplit[]): ISplitMutations {
  const segments = new _Set<string>();
  const computed = entries.reduce((accum, split) => {
    if (split.status === 'ACTIVE') {
      accum.added.push([split.name, JSON.stringify(split)]);

      parseSegments(split).forEach((segmentName: string) => {
        segments.add(segmentName);
      });
    } else {
      accum.removed.push(split.name);
    }

    return accum;
  }, { added: [], removed: [], segments: [] } as ISplitMutations);

  computed.segments = setToArray(segments);

  return computed;
}

/**
 * factory of SplitChanges updater, a task that:
 *  - fetches split changes using `splitChangesFetcher`
 *  - updates `splitsCache`
 *  - uses `splitsEventEmitter` to emit events related to split data updates
 * Exported for testing purposes.
 */
export function splitChangesUpdaterFactory(
  log: ILogger,
  splitChangesFetcher: ISplitChangesFetcher,
  splitsCache: ISplitsCacheBase,
  segmentsCache: ISegmentsCacheSync,
  splitsEventEmitter: ISplitsEventEmitter,
  requestTimeoutBeforeReady: number,
  retriesOnFailureBeforeReady: number,
): ISplitChangesUpdater {

  let startingUp = true;
  let readyOnAlreadyExistentState = true;

  /** timeout and telemetry decorator for `splitChangesFetcher` promise  */
  function _promiseDecorator(promise: Promise<Response>) {
    if (startingUp && requestTimeoutBeforeReady) promise = timeout(requestTimeoutBeforeReady, promise);
    return promise;

    // @TODO telemetry
    // const collectMetrics = startingUp || isNode; // If we are on the browser, only collect this metric for first fetch. On node do it always.
    // splitsPromise = tracker.start(tracker.TaskNames.SPLITS_FETCH, collectMetrics ? metricCollectors : false, splitsPromise);
  }

  /**
   * SplitChanges updater returns a promise that resolves with a `false` boolean value if it fails to fetch splits or synchronize them with the storage.
   *
   * @param {boolean | undefined} noCache true to revalidate data to fetch
   */
  return function splitChangesUpdater(noCache?: boolean) {

    /**
     * @param {number} since current changeNumber at splitsCache
     * @param {number} retry current number of retry attemps
     */
    function _splitChangesUpdater(since: number, retry = 0): Promise<boolean> {
      log.debug(SYNC_SPLITS_FETCH, [since]);

      const fetcherPromise = splitChangesFetcher(since, noCache, _promiseDecorator)
        .then((splitChanges: ISplitChangesResponse) => {
          startingUp = false;

          const mutation = computeSplitsMutation(splitChanges.splits);

          log.debug(SYNC_SPLITS_NEW, [mutation.added.length]);
          log.debug(SYNC_SPLITS_REMOVED, [mutation.removed.length]);
          log.debug(SYNC_SPLITS_SEGMENTS, [mutation.segments.length]);

          // Write into storage
          // @TODO call `setChangeNumber` only if the other storage operations have succeeded, in order to keep storage consistency
          return Promise.all([
            // calling first `setChangenumber` method, to perform cache flush if split filter queryString changed
            splitsCache.setChangeNumber(splitChanges.till),
            splitsCache.addSplits(mutation.added),
            splitsCache.removeSplits(mutation.removed),
            segmentsCache.registerSegments(mutation.segments)
          ]).then(() => {
            // For server-side SDK, we must check that all registered segments have been fetched
            if (readyOnAlreadyExistentState || (since !== splitChanges.till && checkAllSegmentsExist(segmentsCache))) {
              readyOnAlreadyExistentState = false;
              splitsEventEmitter.emit(SDK_SPLITS_ARRIVED);
            }
            return true;
          });
        })
        .catch(error => {
          // handle user callback errors
          if (!(error instanceof SplitError)) {
            setTimeout(() => { throw error; }, 0);
            startingUp = false; // Stop retrying.
          }

          log.warn(SYNC_SPLITS_FETCH_FAILS, [error]);

          if (startingUp && retriesOnFailureBeforeReady > retry) {
            retry += 1;
            log.info(SYNC_SPLITS_FETCH_RETRY, [retry, error]);
            return _splitChangesUpdater(since, retry);
          } else {
            startingUp = false;
          }
          return false;
        });

      // After triggering the requests, if we have cached splits information let's notify that.
      if (startingUp && splitsCache.checkCache()) splitsEventEmitter.emit(SDK_SPLITS_CACHE_LOADED);

      return fetcherPromise;
    }

    const since = splitsCache.getChangeNumber();
    // Adding an extra promise to keep the fetch call asynchronous
    const sincePromise: Promise<number> = thenable(since) ? since : Promise.resolve(since);
    return sincePromise.then(_splitChangesUpdater);
  };
}