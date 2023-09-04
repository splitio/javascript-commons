import { ISplit } from '../../../../dtos/types';
import { readinessManagerFactory } from '../../../../readiness/readinessManager';
import { splitApiFactory } from '../../../../services/splitApi';
import { SegmentsCacheInMemory } from '../../../../storages/inMemory/SegmentsCacheInMemory';
import { SplitsCacheInMemory } from '../../../../storages/inMemory/SplitsCacheInMemory';
import { splitChangesFetcherFactory } from '../../fetchers/splitChangesFetcher';
import { splitChangesUpdaterFactory, parseSegments, computeSplitsMutation } from '../splitChangesUpdater';
import splitChangesMock1 from '../../../../__tests__/mocks/splitchanges.since.-1.json';
import fetchMock from '../../../../__tests__/testUtils/fetchMock';
import { settingsSplitApi } from '../../../../utils/settingsValidation/__tests__/settings.mocks';
import { EventEmitter } from '../../../../utils/MinEvents';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';
import { telemetryTrackerFactory } from '../../../../trackers/telemetryTracker';
import { splitNotifications } from '../../../streaming/__tests__/dataMocks';

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
  const splitFiltersValidation = { queryString: null, groupedFilters: { bySet: [], byName: [], byPrefix: [] }, validFilters: [], originalFilters: [] };

  let splitsMutation = computeSplitsMutation([activeSplitWithSegments, archivedSplit] as ISplit[], splitFiltersValidation);

  expect(splitsMutation.added).toEqual([[activeSplitWithSegments.name, activeSplitWithSegments]]);
  expect(splitsMutation.removed).toEqual([archivedSplit.name]);
  expect(splitsMutation.segments).toEqual(['A', 'B']);

  // SDK initialization without sets
  // should process all the notifications
  splitsMutation = computeSplitsMutation([testFFSetsAB, test2FFSetsX] as ISplit[], splitFiltersValidation);

  expect(splitsMutation.added).toEqual([[testFFSetsAB.name, testFFSetsAB],[test2FFSetsX.name, test2FFSetsX]]);
  expect(splitsMutation.removed).toEqual([]);
  expect(splitsMutation.segments).toEqual([]);
});

test('splitChangesUpdater / compute splits mutation with filters', () => {
  // SDK initialization with sets: [set_a, set_b]
  let splitFiltersValidation = { queryString: '&sets=set_a,set_b', groupedFilters: { bySet: ['set_a','set_b'], byName: ['name_1'], byPrefix: [] }, validFilters: [], originalFilters: [] };

  // fetching new feature flag in sets A & B
  let splitsMutation = computeSplitsMutation([testFFSetsAB], splitFiltersValidation);

  // should add it to mutations
  expect(splitsMutation.added).toEqual([[testFFSetsAB.name, testFFSetsAB]]);
  expect(splitsMutation.removed).toEqual([]);

  // fetching existing test feature flag removed from set B
  splitsMutation = computeSplitsMutation([testFFRemoveSetB], splitFiltersValidation);

  expect(splitsMutation.added).toEqual([[testFFRemoveSetB.name, testFFRemoveSetB]]);
  expect(splitsMutation.removed).toEqual([]);

  // fetching existing test feature flag removed from set B
  splitsMutation = computeSplitsMutation([testFFRemoveSetA], splitFiltersValidation);

  expect(splitsMutation.added).toEqual([]);
  expect(splitsMutation.removed).toEqual([testFFRemoveSetA.name]);

  // fetching existing test feature flag removed from set B
  splitsMutation = computeSplitsMutation([testFFEmptySet], splitFiltersValidation);

  expect(splitsMutation.added).toEqual([]);
  expect(splitsMutation.removed).toEqual([testFFEmptySet.name]);

  // SDK initialization with names: ['test2']
  splitFiltersValidation = { queryString: '&names=test2', groupedFilters: { bySet: [], byName: ['test2'], byPrefix: [] }, validFilters: [], originalFilters: [] };
  splitsMutation = computeSplitsMutation([testFFSetsAB], splitFiltersValidation);

  expect(splitsMutation.added).toEqual([]);
  expect(splitsMutation.removed).toEqual([testFFSetsAB.name]);

  splitsMutation = computeSplitsMutation([test2FFSetsX, testFFEmptySet], splitFiltersValidation);

  expect(splitsMutation.added).toEqual([[test2FFSetsX.name, test2FFSetsX],]);
  expect(splitsMutation.removed).toEqual([testFFEmptySet.name]);
});

describe('splitChangesUpdater', () => {

  fetchMock.once('*', { status: 200, body: splitChangesMock1 }); // @ts-ignore
  const splitApi = splitApiFactory(settingsSplitApi, { getFetch: () => fetchMock, EventEmitter }, telemetryTrackerFactory());
  const fetchSplitChanges = jest.spyOn(splitApi, 'fetchSplitChanges');
  const splitChangesFetcher = splitChangesFetcherFactory(splitApi.fetchSplitChanges);

  const splitsCache = new SplitsCacheInMemory();
  const setChangeNumber = jest.spyOn(splitsCache, 'setChangeNumber');
  const addSplits = jest.spyOn(splitsCache, 'addSplits');
  const removeSplits = jest.spyOn(splitsCache, 'removeSplits');

  const segmentsCache = new SegmentsCacheInMemory();
  const registerSegments = jest.spyOn(segmentsCache, 'registerSegments');
  const readinessManager = readinessManagerFactory(EventEmitter);
  const splitsEmitSpy = jest.spyOn(readinessManager.splits, 'emit');

  const splitFiltersValidation = { queryString: null, groupedFilters: { bySet: [], byName: [], byPrefix: [] }, validFilters: [], originalFilters: [] };

  const splitChangesUpdater = splitChangesUpdaterFactory(loggerMock, splitChangesFetcher, splitsCache, segmentsCache, splitFiltersValidation, readinessManager.splits, 1000, 1);

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('test without payload', async () => {
    const result = await splitChangesUpdater();
    expect(setChangeNumber).toBeCalledTimes(1);
    expect(setChangeNumber).lastCalledWith(splitChangesMock1.till);
    expect(addSplits).toBeCalledTimes(1);
    expect(addSplits.mock.calls[0][0].length).toBe(splitChangesMock1.splits.length);
    expect(removeSplits).toBeCalledTimes(1);
    expect(removeSplits).lastCalledWith([]);
    expect(registerSegments).toBeCalledTimes(1);
    expect(splitsEmitSpy).toBeCalledWith('state::splits-arrived');
    expect(result).toBe(true);
  });

  test('test with payload', async () => {
    let index = 0;
    for (const notification of splitNotifications) {
      const payload = notification.decoded as Pick<ISplit, 'name' | 'changeNumber' | 'killed' | 'defaultTreatment' | 'trafficTypeName' | 'conditions' | 'status' | 'seed' | 'trafficAllocation' | 'trafficAllocationSeed' | 'configurations'>;
      const changeNumber = payload.changeNumber;

      await expect(splitChangesUpdater(undefined, undefined, { payload: {...payload, sets:[]}, changeNumber: changeNumber })).resolves.toBe(true);
      // fetch not being called
      expect(fetchSplitChanges).toBeCalledTimes(0);
      // Change number being updated
      expect(setChangeNumber).toBeCalledTimes(index + 1);
      expect(setChangeNumber.mock.calls[index][0]).toEqual(changeNumber);
      // Add feature flag in notification
      expect(addSplits).toBeCalledTimes(index + 1);
      expect(addSplits.mock.calls[index][0].length).toBe(payload.status === ARCHIVED_FF ? 0 : 1);
      // Remove feature flag if status is ARCHIVED
      expect(removeSplits).toBeCalledTimes(index + 1);
      expect(removeSplits.mock.calls[index][0]).toEqual(payload.status === ARCHIVED_FF ? [payload.name] : []);
      // fetch segments after feature flag update
      expect(registerSegments).toBeCalledTimes(index + 1);
      expect(registerSegments.mock.calls[index][0]).toEqual(payload.status === ARCHIVED_FF ? [] : ['maur-2']);
      index++;
    }
  });
});
