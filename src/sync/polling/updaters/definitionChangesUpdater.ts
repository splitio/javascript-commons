import { ISegmentsCacheBase, IStorageBase } from '../../../storages/types';
import { IDefinitionChangesFetcher } from '../fetchers/types';
import { IRBSegment, IDefinition, IDefinitionChangesResponse, ISplitFiltersValidation, MaybeThenable } from '../../../dtos/types';
import { ISplitsEventEmitter } from '../../../readiness/types';
import { timeout } from '../../../utils/promise/timeout';
import { SDK_SPLITS_ARRIVED, FLAGS_UPDATE, SEGMENTS_UPDATE, CONFIGS_UPDATE } from '../../../readiness/constants';
import { ILogger } from '../../../logger/types';
import { SYNC_FETCH, SYNC_UPDATE, SYNC_FETCH_FAILS, SYNC_FETCH_RETRY } from '../../../logger/constants';
import { startsWith } from '../../../utils/lang';
import { IN_RULE_BASED_SEGMENT, IN_SEGMENT, RULE_BASED_SEGMENT, STANDARD_SEGMENT } from '../../../utils/constants';
import { setToArray } from '../../../utils/lang/sets';
import { SPLIT_UPDATE } from '../../streaming/constants';
import { SdkUpdateMetadata } from '../../../../types/splitio';

export type InstantUpdate = { payload: IDefinition | IRBSegment, changeNumber: number, type: string };
type DefinitionChangesUpdater = (noCache?: boolean, till?: number, instantUpdate?: InstantUpdate) => Promise<boolean>

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
 * Collect segments from a raw FF or RBS definition.
 * Exported for testing purposes.
 */
export function parseSegments(ruleEntity: IDefinition | IRBSegment, matcherType: typeof IN_SEGMENT | typeof IN_RULE_BASED_SEGMENT = IN_SEGMENT): Set<string> {
  const { conditions, excluded } = ruleEntity as IRBSegment;

  const segments = new Set<string>();
  if (excluded && excluded.segments) {
    excluded.segments.forEach(({ type, name }) => {
      if ((type === STANDARD_SEGMENT && matcherType === IN_SEGMENT) || (type === RULE_BASED_SEGMENT && matcherType === IN_RULE_BASED_SEGMENT)) {
        segments.add(name);
      }
    });
  }

  if (conditions) {
    for (let i = 0; i < conditions.length; i++) {
      const matchers = conditions[i].matcherGroup.matchers;

      matchers.forEach(matcher => {
        if (matcher.matcherType === matcherType) segments.add(matcher.userDefinedSegmentMatcherData.segmentName);
      });
    }
  }

  return segments;
}

interface IDefinitionMutations<T extends IDefinition | IRBSegment> {
  added: T[],
  removed: string[],
  names: string[]
}

/**
 * If there are defined filters and one definition doesn't match with them, its status is changed to 'ARCHIVE' to avoid storing it
 * If there is `bySet` filter, `byName` and `byPrefix` filters are ignored
 *
 * @param definition - definition to be evaluated
 * @param filters - splitFiltersValidation bySet | byName
 */
function matchFilters(definition: IDefinition, filters: ISplitFiltersValidation) {
  const { bySet: setsFilter, byName: namesFilter, byPrefix: prefixFilter } = filters.groupedFilters;
  if (setsFilter.length > 0) return definition.sets && definition.sets.some((definitionSet: string) => setsFilter.indexOf(definitionSet) > -1);

  const namesFilterConfigured = namesFilter.length > 0;
  const prefixFilterConfigured = prefixFilter.length > 0;

  if (!namesFilterConfigured && !prefixFilterConfigured) return true;

  const matchNames = namesFilterConfigured && namesFilter.indexOf(definition.name) > -1;
  const matchPrefix = prefixFilterConfigured && prefixFilter.some(prefix => startsWith(definition.name, prefix));
  return matchNames || matchPrefix;
}

/**
 * Given the list of definitions from /splitChanges or /configs endpoint, it returns the mutations,
 * i.e., an object with added definitions, removed definitions, and used segments.
 * Exported for testing purposes.
 */
export function computeMutation<T extends IDefinition | IRBSegment>(rules: Array<T>, segments: Set<string>, filters?: ISplitFiltersValidation): IDefinitionMutations<T> {

  return rules.reduce((accum, ruleEntity) => {
    if (ruleEntity.status !== 'ARCHIVED' && (!filters || matchFilters(ruleEntity as IDefinition, filters))) {
      accum.added.push(ruleEntity);

      parseSegments(ruleEntity).forEach((segmentName: string) => {
        segments.add(segmentName);
      });
    } else {
      accum.removed.push(ruleEntity.name);
    }
    accum.names.push(ruleEntity.name);

    return accum;
  }, { added: [], removed: [], names: [] } as IDefinitionMutations<T>);
}

/**
 * Factory of DefinitionChanges updater, a task that:
 *  - fetches definition changes using `definitionChangesFetcher`
 *  - updates definitions storage
 *  - uses `definitionsEventEmitter` to emit events related to definition data updates
 *
 * @param log -  Logger instance
 * @param definitionChangesFetcher -  Fetcher of `/splitChanges` or `/configs`
 * @param definitions -  Definitions storage, with sync or async methods
 * @param segments -  Segments storage, with sync or async methods
 * @param definitionsEventEmitter -  Optional readiness manager. Not required for synchronizer or producer mode.
 * @param requestTimeoutBeforeReady -  How long the updater will wait for the request to timeout. Default 0, i.e., never timeout.
 * @param retriesOnFailureBeforeReady -  How many retries on `/splitChanges` or `/configs` we the updater do in case of failure or timeout. Default 0, i.e., no retries.
 */
export function definitionChangesUpdaterFactory(
  log: ILogger,
  definitionChangesFetcher: IDefinitionChangesFetcher,
  storage: Pick<IStorageBase, 'splits' | 'rbSegments' | 'segments' | 'save'>,
  splitFiltersValidation: ISplitFiltersValidation,
  splitsEventEmitter?: ISplitsEventEmitter,
  requestTimeoutBeforeReady = 0,
  retriesOnFailureBeforeReady = 0,
  isClientSide?: boolean
): DefinitionChangesUpdater {
  const { splits, rbSegments, segments } = storage;

  let startingUp = true;

  /** timeout decorator for `definitionChangesFetcher` promise  */
  function _promiseDecorator<T>(promise: Promise<T>) {
    if (startingUp && requestTimeoutBeforeReady) promise = timeout(requestTimeoutBeforeReady, promise);
    return promise;
  }

  /**
   * DefinitionChanges updater returns a promise that resolves with a `false` boolean value if it fails to fetch definitions or synchronize them with the storage.
   * Returned promise will not be rejected.
   *
   * @param noCache - true to revalidate data to fetch
   * @param till - query param to bypass CDN requests
   */
  return function definitionChangesUpdater(noCache?: boolean, till?: number, instantUpdate?: InstantUpdate) {

    /**
     * @param since - current changeNumber at definitionsCache
     * @param retry - current number of retry attempts
     */
    function _definitionChangesUpdater(sinces: [number, number], retry = 0): Promise<boolean> {
      const [since, rbSince] = sinces;
      log.debug(SYNC_FETCH, [definitionChangesFetcher.type, since, rbSince]);
      return Promise.resolve(
        instantUpdate ?
          instantUpdate.type === SPLIT_UPDATE ?
            // IFFU edge case: a change to definition that adds an IN_RULE_BASED_SEGMENT matcher that is not present yet
            Promise.resolve(rbSegments.contains(parseSegments(instantUpdate.payload, IN_RULE_BASED_SEGMENT))).then((contains) => {
              return contains ?
                { ff: { d: [instantUpdate.payload as IDefinition], t: instantUpdate.changeNumber } } :
                definitionChangesFetcher(since, noCache, till, rbSince, _promiseDecorator);
            }) :
            { rbs: { d: [instantUpdate.payload as IRBSegment], t: instantUpdate.changeNumber } } :
          definitionChangesFetcher(since, noCache, till, rbSince, _promiseDecorator)
      )
        .then((definitionChanges: IDefinitionChangesResponse) => {
          const usedSegments = new Set<string>();

          let updatedDefinitions: string[] = [];
          let ffUpdate: MaybeThenable<boolean> = false;
          if (definitionChanges.ff) {
            const { added, removed, names } = computeMutation(definitionChanges.ff.d, usedSegments, splitFiltersValidation);
            updatedDefinitions = names;
            log.debug(SYNC_UPDATE, [definitionChangesFetcher.type, added.length, removed.length]);
            ffUpdate = splits.update(added, removed, definitionChanges.ff.t);
          }

          let rbsUpdate: MaybeThenable<boolean> = false;
          if (definitionChanges.rbs) {
            const { added, removed } = computeMutation(definitionChanges.rbs.d, usedSegments);
            log.debug(SYNC_UPDATE, ['rule-based segments', added.length, removed.length]);
            rbsUpdate = rbSegments.update(added, removed, definitionChanges.rbs.t);
          }

          return Promise.all([ffUpdate, rbsUpdate,
            // @TODO if at least 1 segment fetch fails due to 404 and other segments are updated in the storage, SDK_UPDATE is not emitted
            segments.registerSegments(setToArray(usedSegments))
          ]).then(([ffChanged, rbsChanged]) => {
            if (storage.save) storage.save();

            startingUp = false;

            if (splitsEventEmitter) {
              // To emit SDK_SPLITS_ARRIVED for server-side SDK, we must check that all registered segments have been fetched
              return Promise.resolve(!splitsEventEmitter.splitsArrived || ((ffChanged || rbsChanged) && (isClientSide || checkAllSegmentsExist(segments))))
                .catch(() => false /** noop. just to handle a possible `checkAllSegmentsExist` rejection, before emitting SDK event */)
                .then(emitSplitsArrivedEvent => {
                  // emit SDK events
                  if (emitSplitsArrivedEvent) {
                    const metadata: SdkUpdateMetadata = {
                      type: updatedDefinitions.length > 0 ? definitionChangesFetcher.type === 'configs' ? CONFIGS_UPDATE : FLAGS_UPDATE : SEGMENTS_UPDATE,
                      names: updatedDefinitions.length > 0 ? updatedDefinitions : []
                    };
                    splitsEventEmitter.emit(SDK_SPLITS_ARRIVED, metadata);
                  }
                  return true;
                });
            }
            return true;
          });
        })
        .catch(error => {
          if (startingUp && retriesOnFailureBeforeReady > retry) {
            retry += 1;
            log.warn(SYNC_FETCH_RETRY, [definitionChangesFetcher.type, retry, error]);
            return _definitionChangesUpdater(sinces, retry);
          } else {
            startingUp = false;
            log.warn(SYNC_FETCH_FAILS, [definitionChangesFetcher.type, error]);
          }
          return false;
        });
    }

    // `getChangeNumber` never rejects or throws error
    return Promise.all([splits.getChangeNumber(), rbSegments.getChangeNumber()]).then(_definitionChangesUpdater);
  };
}
