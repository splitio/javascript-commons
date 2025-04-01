import { ISegmentsCacheBase, IStorageBase } from '../../../storages/types';
import { ISplitChangesFetcher } from '../fetchers/types';
import { IRBSegment, ISplit, ISplitChangesResponse, ISplitFiltersValidation, MaybeThenable } from '../../../dtos/types';
import { ISplitsEventEmitter } from '../../../readiness/types';
import { timeout } from '../../../utils/promise/timeout';
import { SDK_SPLITS_ARRIVED } from '../../../readiness/constants';
import { ILogger } from '../../../logger/types';
import { SYNC_SPLITS_FETCH, SYNC_SPLITS_UPDATE, SYNC_RBS_UPDATE, SYNC_SPLITS_FETCH_FAILS, SYNC_SPLITS_FETCH_RETRY } from '../../../logger/constants';
import { startsWith } from '../../../utils/lang';
import { IN_RULE_BASED_SEGMENT, IN_SEGMENT } from '../../../utils/constants';
import { setToArray } from '../../../utils/lang/sets';
import { SPLIT_UPDATE } from '../../streaming/constants';

export type InstantUpdate = { payload: ISplit | IRBSegment, changeNumber: number, type: string };
type SplitChangesUpdater = (noCache?: boolean, till?: number, instantUpdate?: InstantUpdate) => Promise<boolean>

// Checks that all registered segments have been fetched (changeNumber !== -1 for every segment).
// Returns a promise that could be rejected.
// @TODO review together with Segments and MySegments storage APIs
function checkAllSegmentsExist(segments: ISegmentsCacheBase): Promise<boolean> {
  let registeredSegments = Promise.resolve(segments.getRegisteredSegments());
  return registeredSegments.then(segmentNames => {
    return Promise.all(segmentNames.map(segmentName => segments.getChangeNumber(segmentName)))
      .then(changeNumbers => changeNumbers.every(changeNumber => changeNumber !== undefined));
  });
}

/**
 * Collect segments from a raw split definition.
 * Exported for testing purposes.
 */
export function parseSegments(ruleEntity: ISplit | IRBSegment, matcherType: typeof IN_SEGMENT | typeof IN_RULE_BASED_SEGMENT = IN_SEGMENT): Set<string> {
  const { conditions, excluded } = ruleEntity as IRBSegment;
  const segments = new Set<string>(excluded && excluded.segments);

  for (let i = 0; i < conditions.length; i++) {
    const matchers = conditions[i].matcherGroup.matchers;

    matchers.forEach(matcher => {
      if (matcher.matcherType === matcherType) segments.add(matcher.userDefinedSegmentMatcherData.segmentName);
    });
  }

  return segments;
}

interface ISplitMutations<T extends ISplit | IRBSegment> {
  added: T[],
  removed: T[]
}

/**
 * If there are defined filters and one feature flag doesn't match with them, its status is changed to 'ARCHIVE' to avoid storing it
 * If there are set filter defined, names filter is ignored
 *
 * @param featureFlag - feature flag to be evaluated
 * @param filters - splitFiltersValidation bySet | byName
 */
function matchFilters(featureFlag: ISplit, filters: ISplitFiltersValidation) {
  const { bySet: setsFilter, byName: namesFilter, byPrefix: prefixFilter } = filters.groupedFilters;
  if (setsFilter.length > 0) return featureFlag.sets && featureFlag.sets.some((featureFlagSet: string) => setsFilter.indexOf(featureFlagSet) > -1);

  const namesFilterConfigured = namesFilter.length > 0;
  const prefixFilterConfigured = prefixFilter.length > 0;

  if (!namesFilterConfigured && !prefixFilterConfigured) return true;

  const matchNames = namesFilterConfigured && namesFilter.indexOf(featureFlag.name) > -1;
  const matchPrefix = prefixFilterConfigured && prefixFilter.some(prefix => startsWith(featureFlag.name, prefix));
  return matchNames || matchPrefix;
}

/**
 * Given the list of splits from /splitChanges endpoint, it returns the mutations,
 * i.e., an object with added splits, removed splits and used segments.
 * Exported for testing purposes.
 */
export function computeMutation<T extends ISplit | IRBSegment>(rules: Array<T>, segments: Set<string>, filters?: ISplitFiltersValidation): ISplitMutations<T> {

  return rules.reduce((accum, ruleEntity) => {
    if (ruleEntity.status === 'ACTIVE' && (!filters || matchFilters(ruleEntity as ISplit, filters))) {
      accum.added.push(ruleEntity);

      parseSegments(ruleEntity).forEach((segmentName: string) => {
        segments.add(segmentName);
      });
    } else {
      accum.removed.push(ruleEntity);
    }

    return accum;
  }, { added: [], removed: [] } as ISplitMutations<T>);
}

/**
 * factory of SplitChanges updater, a task that:
 *  - fetches split changes using `splitChangesFetcher`
 *  - updates `splitsCache`
 *  - uses `splitsEventEmitter` to emit events related to split data updates
 *
 * @param log -  Logger instance
 * @param splitChangesFetcher -  Fetcher of `/splitChanges`
 * @param splits -  Splits storage, with sync or async methods
 * @param segments -  Segments storage, with sync or async methods
 * @param splitsEventEmitter -  Optional readiness manager. Not required for synchronizer or producer mode.
 * @param requestTimeoutBeforeReady -  How long the updater will wait for the request to timeout. Default 0, i.e., never timeout.
 * @param retriesOnFailureBeforeReady -  How many retries on `/splitChanges` we the updater do in case of failure or timeout. Default 0, i.e., no retries.
 */
export function splitChangesUpdaterFactory(
  log: ILogger,
  splitChangesFetcher: ISplitChangesFetcher,
  storage: Pick<IStorageBase, 'splits' | 'rbSegments' | 'segments'>,
  splitFiltersValidation: ISplitFiltersValidation,
  splitsEventEmitter?: ISplitsEventEmitter,
  requestTimeoutBeforeReady: number = 0,
  retriesOnFailureBeforeReady: number = 0,
  isClientSide?: boolean
): SplitChangesUpdater {
  const { splits, rbSegments, segments } = storage;

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
   * @param noCache - true to revalidate data to fetch
   * @param till - query param to bypass CDN requests
   */
  return function splitChangesUpdater(noCache?: boolean, till?: number, instantUpdate?: InstantUpdate) {

    /**
     * @param since - current changeNumber at splitsCache
     * @param retry - current number of retry attempts
     */
    function _splitChangesUpdater(sinces: [number, number], retry = 0): Promise<boolean> {
      const [since, rbSince] = sinces;
      log.debug(SYNC_SPLITS_FETCH, sinces);
      return Promise.resolve(
        instantUpdate ?
          instantUpdate.type === SPLIT_UPDATE ?
            // IFFU edge case: a change to a flag that adds an IN_RULE_BASED_SEGMENT matcher that is not present yet
            Promise.resolve(rbSegments.contains(parseSegments(instantUpdate.payload, IN_RULE_BASED_SEGMENT))).then((contains) => {
              return contains ?
                { ff: { d: [instantUpdate.payload as ISplit], t: instantUpdate.changeNumber } } :
                splitChangesFetcher(since, noCache, till, rbSince, _promiseDecorator);
            }) :
            { rbs: { d: [instantUpdate.payload as IRBSegment], t: instantUpdate.changeNumber } } :
          splitChangesFetcher(since, noCache, till, rbSince, _promiseDecorator)
      )
        .then((splitChanges: ISplitChangesResponse) => {
          startingUp = false;

          const usedSegments = new Set<string>();

          let ffUpdate: MaybeThenable<boolean> = false;
          if (splitChanges.ff) {
            const { added, removed } = computeMutation(splitChanges.ff.d, usedSegments, splitFiltersValidation);
            log.debug(SYNC_SPLITS_UPDATE, [added.length, removed.length]);
            ffUpdate = splits.update(added, removed, splitChanges.ff.t);
          }

          let rbsUpdate: MaybeThenable<boolean> = false;
          if (splitChanges.rbs) {
            const { added, removed } = computeMutation(splitChanges.rbs.d, usedSegments);
            log.debug(SYNC_RBS_UPDATE, [added.length, removed.length]);
            rbsUpdate = rbSegments.update(added, removed, splitChanges.rbs.t);
          }

          return Promise.all([ffUpdate, rbsUpdate,
            // @TODO if at least 1 segment fetch fails due to 404 and other segments are updated in the storage, SDK_UPDATE is not emitted
            segments.registerSegments(setToArray(usedSegments))
          ]).then(([ffChanged, rbsChanged]) => {
            if (splitsEventEmitter) {
              // To emit SDK_SPLITS_ARRIVED for server-side SDK, we must check that all registered segments have been fetched
              return Promise.resolve(!splitsEventEmitter.splitsArrived || ((ffChanged || rbsChanged) && (isClientSide || checkAllSegmentsExist(segments))))
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
            return _splitChangesUpdater(sinces, retry);
          } else {
            startingUp = false;
          }
          return false;
        });
    }

    // `getChangeNumber` never rejects or throws error
    return Promise.all([splits.getChangeNumber(), rbSegments.getChangeNumber()]).then(_splitChangesUpdater);
  };
}
