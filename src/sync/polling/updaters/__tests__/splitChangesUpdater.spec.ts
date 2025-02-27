import { ISplit } from '../../../../dtos/types';
import { readinessManagerFactory } from '../../../../readiness/readinessManager';
import { splitApiFactory } from '../../../../services/splitApi';
import { SegmentsCacheInMemory } from '../../../../storages/inMemory/SegmentsCacheInMemory';
import { SplitsCacheInMemory } from '../../../../storages/inMemory/SplitsCacheInMemory';
import { splitChangesFetcherFactory } from '../../fetchers/splitChangesFetcher';
import { splitChangesUpdaterFactory, parseSegments, computeMutation } from '../splitChangesUpdater';
import splitChangesMock1 from '../../../../__tests__/mocks/splitchanges.since.-1.json';
import fetchMock from '../../../../__tests__/testUtils/fetchMock';
import { fullSettings, settingsSplitApi } from '../../../../utils/settingsValidation/__tests__/settings.mocks';
import { EventEmitter } from '../../../../utils/MinEvents';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';
import { telemetryTrackerFactory } from '../../../../trackers/telemetryTracker';
import { splitNotifications } from '../../../streaming/__tests__/dataMocks';
import { RBSegmentsCacheInMemory } from '../../../../storages/inMemory/RBSegmentsCacheInMemory';

const ARCHIVED_FF = 'ARCHIVED';

const activeSplitWithSegments = {
  name: 'Split1',
  status: 'ACTIVE',
  conditions: [{
    matcherGroup: {
      combiner: 'AND',
      matchers: [{
        matcherType: 'IN_SEGMENT',
        userDefinedSegmentMatcherData: {
          segmentName: 'A'
        }
      }, {
        matcherType: 'IN_SEGMENT',
        userDefinedSegmentMatcherData: {
          segmentName: 'B'
        }
      }]
    }
  }]
};

const archivedSplit = {
  name: 'Split2',
  status: 'ARCHIVED'
};
// @ts-ignore
const testFFSetsAB: ISplit =
{
  name: 'test',
  status: 'ACTIVE',
  conditions: [],
  killed: false,
  sets: ['set_a', 'set_b']
};
// @ts-ignore
const test2FFSetsX: ISplit =
{
  name: 'test2',
  status: 'ACTIVE',
  conditions: [],
  killed: false,
  sets: ['set_x']
};
// @ts-ignore
const testFFRemoveSetB: ISplit =
{
  name: 'test',
  status: 'ACTIVE',
  conditions: [],
  sets: ['set_a']
};
// @ts-ignore
const testFFRemoveSetA: ISplit =
{
  name: 'test',
  status: 'ACTIVE',
  conditions: [],
  sets: ['set_x']
};
// @ts-ignore
const testFFEmptySet: ISplit =
{
  name: 'test',
  status: 'ACTIVE',
  conditions: [],
  sets: []
};

test('splitChangesUpdater / segments parser', () => {

  const segments = parseSegments(activeSplitWithSegments as ISplit);

  expect(segments.has('A')).toBe(true);
  expect(segments.has('B')).toBe(true);
});

test('splitChangesUpdater / compute splits mutation', () => {
  const splitFiltersValidation = { queryString: null, groupedFilters: { bySet: [], byName: [], byPrefix: [] }, validFilters: [] };

  let segments = new Set<string>();
  let splitsMutation = computeMutation([activeSplitWithSegments, archivedSplit] as ISplit[], segments, splitFiltersValidation);

  expect(splitsMutation.added).toEqual([activeSplitWithSegments]);
  expect(splitsMutation.removed).toEqual([archivedSplit]);
  expect(Array.from(segments)).toEqual(['A', 'B']);

  // SDK initialization without sets
  // should process all the notifications
  segments = new Set<string>();
  splitsMutation = computeMutation([testFFSetsAB, test2FFSetsX] as ISplit[], segments, splitFiltersValidation);

  expect(splitsMutation.added).toEqual([testFFSetsAB, test2FFSetsX]);
  expect(splitsMutation.removed).toEqual([]);
  expect(Array.from(segments)).toEqual([]);
});

test('splitChangesUpdater / compute splits mutation with filters', () => {
  // SDK initialization with sets: [set_a, set_b]
  let splitFiltersValidation = { queryString: '&sets=set_a,set_b', groupedFilters: { bySet: ['set_a', 'set_b'], byName: ['name_1'], byPrefix: [] }, validFilters: [] };

  // fetching new feature flag in sets A & B
  let splitsMutation = computeMutation([testFFSetsAB], new Set(), splitFiltersValidation);

  // should add it to mutations
  expect(splitsMutation.added).toEqual([testFFSetsAB]);
  expect(splitsMutation.removed).toEqual([]);

  // fetching existing test feature flag removed from set B
  splitsMutation = computeMutation([testFFRemoveSetB], new Set(), splitFiltersValidation);

  expect(splitsMutation.added).toEqual([testFFRemoveSetB]);
  expect(splitsMutation.removed).toEqual([]);

  // fetching existing test feature flag removed from set B
  splitsMutation = computeMutation([testFFRemoveSetA], new Set(), splitFiltersValidation);

  expect(splitsMutation.added).toEqual([]);
  expect(splitsMutation.removed).toEqual([testFFRemoveSetA]);

  // fetching existing test feature flag removed from set B
  splitsMutation = computeMutation([testFFEmptySet], new Set(), splitFiltersValidation);

  expect(splitsMutation.added).toEqual([]);
  expect(splitsMutation.removed).toEqual([testFFEmptySet]);

  // SDK initialization with names: ['test2']
  splitFiltersValidation = { queryString: '&names=test2', groupedFilters: { bySet: [], byName: ['test2'], byPrefix: [] }, validFilters: [] };
  splitsMutation = computeMutation([testFFSetsAB], new Set(), splitFiltersValidation);

  expect(splitsMutation.added).toEqual([]);
  expect(splitsMutation.removed).toEqual([testFFSetsAB]);

  splitsMutation = computeMutation([test2FFSetsX, testFFEmptySet], new Set(), splitFiltersValidation);

  expect(splitsMutation.added).toEqual([test2FFSetsX]);
  expect(splitsMutation.removed).toEqual([testFFEmptySet]);
});

describe('splitChangesUpdater', () => {

  fetchMock.once('*', { status: 200, body: splitChangesMock1 }); // @ts-ignore
  const splitApi = splitApiFactory(settingsSplitApi, { getFetch: () => fetchMock }, telemetryTrackerFactory());
  const fetchSplitChanges = jest.spyOn(splitApi, 'fetchSplitChanges');
  const splitChangesFetcher = splitChangesFetcherFactory(splitApi.fetchSplitChanges);

  const splits = new SplitsCacheInMemory();
  const updateSplits = jest.spyOn(splits, 'update');

  const rbSegments = new RBSegmentsCacheInMemory();

  const segments = new SegmentsCacheInMemory();
  const registerSegments = jest.spyOn(segments, 'registerSegments');

  const storage = { splits, rbSegments, segments };

  const readinessManager = readinessManagerFactory(EventEmitter, fullSettings);
  const splitsEmitSpy = jest.spyOn(readinessManager.splits, 'emit');

  let splitFiltersValidation = { queryString: null, groupedFilters: { bySet: [], byName: [], byPrefix: [] }, validFilters: [] };

  let splitChangesUpdater = splitChangesUpdaterFactory(loggerMock, splitChangesFetcher, storage, splitFiltersValidation, readinessManager.splits, 1000, 1);

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('test without payload', async () => {
    const result = await splitChangesUpdater();
    expect(updateSplits).toBeCalledTimes(1);
    expect(updateSplits).lastCalledWith(splitChangesMock1.ff.d, [], splitChangesMock1.ff.t);
    expect(registerSegments).toBeCalledTimes(1);
    expect(splitsEmitSpy).toBeCalledWith('state::splits-arrived');
    expect(result).toBe(true);
  });

  test('test with payload', async () => {
    let index = 0;
    for (const notification of splitNotifications) {
      const payload = notification.decoded as Pick<ISplit, 'name' | 'changeNumber' | 'killed' | 'defaultTreatment' | 'trafficTypeName' | 'conditions' | 'status' | 'seed' | 'trafficAllocation' | 'trafficAllocationSeed' | 'configurations'>;
      const changeNumber = payload.changeNumber;

      await expect(splitChangesUpdater(undefined, undefined, { payload, changeNumber: changeNumber })).resolves.toBe(true);
      // fetch not being called
      expect(fetchSplitChanges).toBeCalledTimes(0);
      expect(updateSplits).toBeCalledTimes(index + 1);
      // Change number being updated
      expect(updateSplits.mock.calls[index][2]).toEqual(changeNumber);
      // Add feature flag in notification
      expect(updateSplits.mock.calls[index][0].length).toBe(payload.status === ARCHIVED_FF ? 0 : 1);
      // Remove feature flag if status is ARCHIVED
      expect(updateSplits.mock.calls[index][1]).toEqual(payload.status === ARCHIVED_FF ? [payload] : []);
      // fetch segments after feature flag update
      expect(registerSegments).toBeCalledTimes(index + 1);
      expect(registerSegments.mock.calls[index][0]).toEqual(payload.status === ARCHIVED_FF ? [] : ['maur-2']);
      index++;
    }
  });

  test('flag sets splits-arrived emission', async () => {
    const payload = splitNotifications[3].decoded as Pick<ISplit, 'name' | 'changeNumber' | 'killed' | 'defaultTreatment' | 'trafficTypeName' | 'conditions' | 'status' | 'seed' | 'trafficAllocation' | 'trafficAllocationSeed' | 'configurations'>;
    const setMocks = [
      { sets: [], shouldEmit: false }, /* should not emit if flag does not have any set */
      { sets: ['set_a'], shouldEmit: true }, /* should emit if flag is in configured sets */
      { sets: ['set_b'], shouldEmit: true }, /* should emit if flag was just removed from configured sets */
      { sets: ['set_b'], shouldEmit: false }, /* should NOT emit if flag is nor was just removed from configured sets */
      { sets: ['set_c'], shouldEmit: false }, /* should NOT emit if flag is nor was just removed from configured sets */
      { sets: ['set_a'], shouldEmit: true }, /* should emit if flag is back in configured sets */
    ];

    splitChangesUpdater = splitChangesUpdaterFactory(loggerMock, splitChangesFetcher, storage, splitFiltersValidation, readinessManager.splits, 1000, 1, true);

    let index = 0;
    let calls = 0;
    // emit always if not configured sets
    for (const setMock of setMocks) {
      await expect(splitChangesUpdater(undefined, undefined, { payload: { ...payload, sets: setMock.sets, status: 'ACTIVE' }, changeNumber: index })).resolves.toBe(true);
      expect(splitsEmitSpy.mock.calls[index][0]).toBe('state::splits-arrived');
      index++;
    }

    // @ts-ignore
    splitFiltersValidation = { queryString: null, groupedFilters: { bySet: ['set_a'], byName: [], byPrefix: [] }, validFilters: [] };
    storage.splits.clear();
    splitChangesUpdater = splitChangesUpdaterFactory(loggerMock, splitChangesFetcher, storage, splitFiltersValidation, readinessManager.splits, 1000, 1, true);
    splitsEmitSpy.mockReset();
    index = 0;
    for (const setMock of setMocks) {
      await expect(splitChangesUpdater(undefined, undefined, { payload: { ...payload, sets: setMock.sets, status: 'ACTIVE' }, changeNumber: index })).resolves.toBe(true);
      if (setMock.shouldEmit) calls++;
      expect(splitsEmitSpy.mock.calls.length).toBe(calls);
      index++;
    }

  });
});
