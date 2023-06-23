import { _Set, setToArray, ISet } from '../../../utils/lang/sets';
import { ISegmentsCacheBase, ISplitsCacheBase } from '../../../storages/types';
import { ISplitChangesFetcher } from '../fetchers/types';
import { ISplit, ISplitChangesResponse } from '../../../dtos/types';
import { ISplitsEventEmitter } from '../../../readiness/types';
import { timeout } from '../../../utils/promise/timeout';
import { SDK_SPLITS_ARRIVED, SDK_SPLITS_CACHE_LOADED } from '../../../readiness/constants';
import { ILogger } from '../../../logger/types';
import { SYNC_SPLITS_FETCH, SYNC_SPLITS_NEW, SYNC_SPLITS_REMOVED, SYNC_SPLITS_SEGMENTS, SYNC_SPLITS_FETCH_FAILS, SYNC_SPLITS_FETCH_RETRY } from '../../../logger/constants';

type ISplitChangesUpdater = (noCache?: boolean, till?: number, splitUpdateNotification?: { payload: ISplit, changeNumber: number }) => Promise<boolean>

// Checks that all registered segments have been fetched (changeNumber !== -1 for every segment).
// Returns a promise that could be rejected.
// @TODO review together with Segments and MySegments storage APIs
function checkAllSegmentsExist(segments: ISegmentsCacheBase): Promise<boolean> {
  let registeredSegments = Promise.resolve(segments.getRegisteredSegments());
  return registeredSegments.then(segmentNames => {
    return Promise.all(segmentNames.map(segmentName => segments.getChangeNumber(segmentName)))
      .then(changeNumbers => changeNumbers.every(changeNumber => changeNumber !== -1));
  });
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
  added: [string, ISplit][],
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
      accum.added.push([split.name, split]);

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
 *
 * @param log  Logger instance
 * @param splitChangesFetcher  Fetcher of `/splitChanges`
 * @param splits  Splits storage, with sync or async methods
 * @param segments  Segments storage, with sync or async methods
 * @param splitsEventEmitter  Optional readiness manager. Not required for synchronizer or producer mode.
 * @param requestTimeoutBeforeReady  How long the updater will wait for the request to timeout. Default 0, i.e., never timeout.
 * @param retriesOnFailureBeforeReady  How many retries on `/splitChanges` we the updater do in case of failure or timeout. Default 0, i.e., no retries.
 */
export function splitChangesUpdaterFactory(
  log: ILogger,
  splitChangesFetcher: ISplitChangesFetcher,
  splits: ISplitsCacheBase,
  segments: ISegmentsCacheBase,
  splitsEventEmitter?: ISplitsEventEmitter,
  requestTimeoutBeforeReady: number = 0,
  retriesOnFailureBeforeReady: number = 0,
  isClientSide?: boolean
): ISplitChangesUpdater {

  let startingUp = true;

  /** timeout decorator for `splitChangesFetcher` promise  */
  function _promiseDecorator<T>(promise: Promise<T>) {
    if (startingUp && requestTimeoutBeforeReady) promise = timeout(requestTimeoutBeforeReady, promise);
    return promise;
  }

  /**
   * SplitChanges updater returns a promise that resolves with a `false` boolean value if it fails to fetch splits or synchronize them with the storage.
   * Returned promise will not be rejected.
   *
   * @param {boolean | undefined} noCache true to revalidate data to fetch
   * @param {boolean | undefined} till query param to bypass CDN requests
   */
  return function splitChangesUpdater(noCache?: boolean, till?: number, splitUpdateNotification?: { payload: ISplit, changeNumber: number }) {

    /**
     * @param {number} since current changeNumber at splitsCache
     * @param {number} retry current number of retry attempts
     */
    function _splitChangesUpdater(since: number, retry = 0): Promise<boolean> {
      log.debug(SYNC_SPLITS_FETCH, [since]);
      const fetcherPromise = Promise.resolve(splitUpdateNotification ?
        { splits: [splitUpdateNotification.payload], till: splitUpdateNotification.changeNumber } :
        splitChangesFetcher(since, noCache, till, _promiseDecorator)
      )
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
            splits.setChangeNumber(splitChanges.till),
            splits.addSplits(mutation.added),
            splits.removeSplits(mutation.removed),
            segments.registerSegments(mutation.segments)
          ]).then(() => {

            if (splitsEventEmitter) {
              // To emit SDK_SPLITS_ARRIVED for server-side SDK, we must check that all registered segments have been fetched
              return Promise.resolve(!splitsEventEmitter.splitsArrived || (since !== splitChanges.till && (isClientSide || checkAllSegmentsExist(segments))))
                .catch(() => false /** noop. just to handle a possible `checkAllSegmentsExist` rejection, before emitting SDK event */)
                .then(emitSplitsArrivedEvent => {
                  // emit SDK events
                  if (emitSplitsArrivedEvent) splitsEventEmitter.emit(SDK_SPLITS_ARRIVED);
                  return true;
                });
            }
            return true;
          });
        })
        .catch(error => {
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

      // After triggering the requests, if we have cached splits information let's notify that to emit SDK_READY_FROM_CACHE.
      // Wrapping in a promise since checkCache can be async.
      if (splitsEventEmitter && startingUp) {
        Promise.resolve(splits.checkCache()).then(isCacheReady => {
          if (isCacheReady) splitsEventEmitter.emit(SDK_SPLITS_CACHE_LOADED);
        });
      }
      return fetcherPromise;
    }

    let sincePromise = Promise.resolve(splits.getChangeNumber()); // `getChangeNumber` never rejects or throws error
    return sincePromise.then(_splitChangesUpdater);
  };
}
