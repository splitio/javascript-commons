import { IRBSegment, ISplit } from '../../../../dtos/types';
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
import { RB_SEGMENT_UPDATE, SPLIT_UPDATE } from '../../../streaming/constants';
import { IN_RULE_BASED_SEGMENT } from '../../../../utils/constants';
import { SDK_SPLITS_ARRIVED } from '../../../../readiness/constants';
import { SdkUpdateMetadataKeys } from '../../types';

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
// @ts-ignore
const rbsWithExcludedSegment: IRBSegment = {
  name: 'rbs',
  status: 'ACTIVE',
  conditions: [],
  excluded: {
    segments: [{
      type: 'standard',
      name: 'C'
    }, {
      type: 'rule-based',
      name: 'D'
    }]
  }
};

test('splitChangesUpdater / segments parser', () => {
  let segments = parseSegments(activeSplitWithSegments as ISplit);
  expect(segments).toEqual(new Set(['A', 'B']));

  segments = parseSegments(rbsWithExcludedSegment);
  expect(segments).toEqual(new Set(['C']));

  segments = parseSegments(rbsWithExcludedSegment, IN_RULE_BASED_SEGMENT);
  expect(segments).toEqual(new Set(['D']));
});

test('splitChangesUpdater / compute splits mutation', () => {
  const splitFiltersValidation = { queryString: null, groupedFilters: { bySet: [], byName: [], byPrefix: [] }, validFilters: [] };

  let segments = new Set<string>();
  let splitsMutation = computeMutation([activeSplitWithSegments, archivedSplit] as ISplit[], segments, splitFiltersValidation);

  expect(splitsMutation.added).toEqual([activeSplitWithSegments]);
  expect(splitsMutation.removed).toEqual([archivedSplit]);
  expect(splitsMutation.names).toEqual([activeSplitWithSegments.name, archivedSplit.name]);
  expect(Array.from(segments)).toEqual(['A', 'B']);

  // SDK initialization without sets
  // should process all the notifications
  segments = new Set<string>();
  splitsMutation = computeMutation([testFFSetsAB, test2FFSetsX] as ISplit[], segments, splitFiltersValidation);

  expect(splitsMutation.added).toEqual([testFFSetsAB, test2FFSetsX]);
  expect(splitsMutation.removed).toEqual([]);
  expect(splitsMutation.names).toEqual([testFFSetsAB.name, test2FFSetsX.name]);
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
  expect(splitsMutation.names).toEqual([testFFSetsAB.name]);

  // fetching existing test feature flag removed from set B
  splitsMutation = computeMutation([testFFRemoveSetB], new Set(), splitFiltersValidation);

  expect(splitsMutation.added).toEqual([testFFRemoveSetB]);
  expect(splitsMutation.removed).toEqual([]);
  expect(splitsMutation.names).toEqual([testFFRemoveSetB.name]);

  // fetching existing test feature flag removed from set B
  splitsMutation = computeMutation([testFFRemoveSetA], new Set(), splitFiltersValidation);

  expect(splitsMutation.added).toEqual([]);
  expect(splitsMutation.removed).toEqual([testFFRemoveSetA]);
  expect(splitsMutation.names).toEqual([testFFRemoveSetA.name]);

  // fetching existing test feature flag removed from set B
  splitsMutation = computeMutation([testFFEmptySet], new Set(), splitFiltersValidation);

  expect(splitsMutation.added).toEqual([]);
  expect(splitsMutation.removed).toEqual([testFFEmptySet]);
  expect(splitsMutation.names).toEqual([testFFEmptySet.name]);

  // SDK initialization with names: ['test2']
  splitFiltersValidation = { queryString: '&names=test2', groupedFilters: { bySet: [], byName: ['test2'], byPrefix: [] }, validFilters: [] };
  splitsMutation = computeMutation([testFFSetsAB], new Set(), splitFiltersValidation);

  expect(splitsMutation.added).toEqual([]);
  expect(splitsMutation.removed).toEqual([testFFSetsAB]);
  expect(splitsMutation.names).toEqual([testFFSetsAB.name]);

  splitsMutation = computeMutation([test2FFSetsX, testFFEmptySet], new Set(), splitFiltersValidation);

  expect(splitsMutation.added).toEqual([test2FFSetsX]);
  expect(splitsMutation.removed).toEqual([testFFEmptySet]);
  expect(splitsMutation.names).toEqual([test2FFSetsX.name, testFFEmptySet.name]);
});

describe('splitChangesUpdater', () => {
  const splits = new SplitsCacheInMemory();
  const updateSplits = jest.spyOn(splits, 'update');

  const rbSegments = new RBSegmentsCacheInMemory();
  const updateRbSegments = jest.spyOn(rbSegments, 'update');

  const segments = new SegmentsCacheInMemory();
  const registerSegments = jest.spyOn(segments, 'registerSegments');

  const storage = { splits, rbSegments, segments };

  fetchMock.once('*', { status: 200, body: splitChangesMock1 }); // @ts-ignore
  const splitApi = splitApiFactory(settingsSplitApi, { getFetch: () => fetchMock }, telemetryTrackerFactory());
  const fetchSplitChanges = jest.spyOn(splitApi, 'fetchSplitChanges');
  const splitChangesFetcher = splitChangesFetcherFactory(splitApi.fetchSplitChanges, fullSettings, storage);

  const readinessManager = readinessManagerFactory(EventEmitter, fullSettings);
  const splitsEmitSpy = jest.spyOn(readinessManager.splits, 'emit');

  let splitFiltersValidation = { queryString: null, groupedFilters: { bySet: [], byName: [], byPrefix: [] }, validFilters: [] };

  let splitChangesUpdater = splitChangesUpdaterFactory(loggerMock, splitChangesFetcher, storage, splitFiltersValidation, readinessManager.splits, 1000, 1);

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('test without payload', async () => {
    const result = await splitChangesUpdater();
    const updatedFlags = splitChangesMock1.ff.d.map(ff => ff.name);

    expect(fetchSplitChanges).toBeCalledTimes(1);
    expect(fetchSplitChanges).lastCalledWith(-1, undefined, undefined, -1);
    expect(updateSplits).toBeCalledTimes(1);
    expect(updateSplits).lastCalledWith(splitChangesMock1.ff.d, [], splitChangesMock1.ff.t);
    expect(updateRbSegments).toBeCalledTimes(0); // no rbSegments to update
    expect(registerSegments).toBeCalledTimes(1);
    expect(splitsEmitSpy).toBeCalledWith(SDK_SPLITS_ARRIVED, { type: SdkUpdateMetadataKeys.FLAGS_UPDATE, names: updatedFlags });
    expect(result).toBe(true);
  });

  test('test with ff payload', async () => {
    let index = 0;
    for (const notification of splitNotifications) {
      const payload = notification.decoded as Pick<ISplit, 'name' | 'changeNumber' | 'killed' | 'defaultTreatment' | 'trafficTypeName' | 'conditions' | 'status' | 'seed' | 'trafficAllocation' | 'trafficAllocationSeed' | 'configurations'>;
      const changeNumber = payload.changeNumber;

      await expect(splitChangesUpdater(undefined, undefined, { payload, changeNumber: changeNumber, type: SPLIT_UPDATE })).resolves.toBe(true);

      // fetch and RBSegments.update not being called
      expect(fetchSplitChanges).toBeCalledTimes(0);
      expect(updateRbSegments).toBeCalledTimes(0);

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

  test('test with rbsegment payload', async () => {
    const payload = { name: 'rbsegment', status: 'ACTIVE', changeNumber: 1684329854385, conditions: [] } as unknown as IRBSegment;
    const changeNumber = payload.changeNumber;

    await expect(splitChangesUpdater(undefined, undefined, { payload, changeNumber: changeNumber, type: RB_SEGMENT_UPDATE })).resolves.toBe(true);

    // fetch and Splits.update not being called
    expect(fetchSplitChanges).toBeCalledTimes(0);
    expect(updateSplits).toBeCalledTimes(0);

    expect(updateRbSegments).toBeCalledTimes(1);
    expect(updateRbSegments).toBeCalledWith([payload], [], changeNumber);

    expect(registerSegments).toBeCalledTimes(1);
    expect(registerSegments).toBeCalledWith([]);
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
      await expect(splitChangesUpdater(undefined, undefined, { payload: { ...payload, sets: setMock.sets, status: 'ACTIVE' }, changeNumber: index, type: SPLIT_UPDATE })).resolves.toBe(true);
      expect(splitsEmitSpy.mock.calls[index][0]).toBe(SDK_SPLITS_ARRIVED);
      expect(splitsEmitSpy.mock.calls[index][1]).toEqual({ type: SdkUpdateMetadataKeys.FLAGS_UPDATE, names: [payload.name] });
      index++;
    }

    // @ts-ignore
    splitFiltersValidation = { queryString: null, groupedFilters: { bySet: ['set_a'], byName: [], byPrefix: [] }, validFilters: [] };
    storage.splits.clear();
    splitChangesUpdater = splitChangesUpdaterFactory(loggerMock, splitChangesFetcher, storage, splitFiltersValidation, readinessManager.splits, 1000, 1, true);
    splitsEmitSpy.mockReset();
    index = 0;
    for (const setMock of setMocks) {
      await expect(splitChangesUpdater(undefined, undefined, { payload: { ...payload, sets: setMock.sets, status: 'ACTIVE' }, changeNumber: index, type: SPLIT_UPDATE })).resolves.toBe(true);
      if (setMock.shouldEmit) calls++;
      expect(splitsEmitSpy.mock.calls.length).toBe(calls);
      index++;
    }

  });

  test('test with ff payload - should emit metadata with flag name', async () => {
    splitsEmitSpy.mockClear();

    readinessManager.splits.splitsArrived = false;
    storage.splits.clear();

    const payload = splitNotifications[0].decoded as Pick<ISplit, 'name' | 'changeNumber' | 'killed' | 'defaultTreatment' | 'trafficTypeName' | 'conditions' | 'status' | 'seed' | 'trafficAllocation' | 'trafficAllocationSeed' | 'configurations'>;
    const changeNumber = payload.changeNumber;

    await expect(splitChangesUpdater(undefined, undefined, { payload, changeNumber: changeNumber, type: SPLIT_UPDATE })).resolves.toBe(true);

    expect(splitsEmitSpy).toBeCalledWith(SDK_SPLITS_ARRIVED, { type: SdkUpdateMetadataKeys.FLAGS_UPDATE, names: [payload.name] });
  });

  test('test with multiple flags updated - should emit metadata with all flag names', async () => {
    splitsEmitSpy.mockClear();
    storage.splits.clear();
    storage.segments.clear();
    // Start with splitsArrived = false so it emits on first update
    readinessManager.splits.splitsArrived = false;
    readinessManager.segments.segmentsArrived = true; // Segments ready

    const flag1 = { name: 'flag1', status: 'ACTIVE', changeNumber: 100, conditions: [] } as unknown as ISplit;
    const flag2 = { name: 'flag2', status: 'ACTIVE', changeNumber: 101, conditions: [] } as unknown as ISplit;
    const flag3 = { name: 'flag3', status: 'ACTIVE', changeNumber: 102, conditions: [] } as unknown as ISplit;

    fetchMock.once('*', { status: 200, body: { ff: { d: [flag1, flag2, flag3], t: 102 } } });
    await splitChangesUpdater();

    // Should emit with metadata when splitsArrived is false (first update)
    expect(splitsEmitSpy).toBeCalledWith(SDK_SPLITS_ARRIVED, { type: SdkUpdateMetadataKeys.FLAGS_UPDATE, names: ['flag1', 'flag2', 'flag3'] });
  });

  test('test with ARCHIVED flag - should emit metadata with flag name', async () => {
    splitsEmitSpy.mockClear();
    storage.splits.clear();
    storage.segments.clear();
    // Start with splitsArrived = false so it emits on first update
    readinessManager.splits.splitsArrived = false;
    readinessManager.segments.segmentsArrived = true; // Segments ready

    const archivedFlag = { name: 'archived-flag', status: ARCHIVED_FF, changeNumber: 200, conditions: [] } as unknown as ISplit;

    const payload = archivedFlag as Pick<ISplit, 'name' | 'changeNumber' | 'killed' | 'defaultTreatment' | 'trafficTypeName' | 'conditions' | 'status' | 'seed' | 'trafficAllocation' | 'trafficAllocationSeed' | 'configurations'>;
    const changeNumber = payload.changeNumber;

    await expect(splitChangesUpdater(undefined, undefined, { payload, changeNumber: changeNumber, type: SPLIT_UPDATE })).resolves.toBe(true);

    // Should emit with metadata when splitsArrived is false (first update)
    expect(splitsEmitSpy).toBeCalledWith(SDK_SPLITS_ARRIVED, { type: SdkUpdateMetadataKeys.FLAGS_UPDATE, names: [payload.name] });
  });

  test('test with rbsegment payload - should emit SEGMENTS_UPDATE not FLAGS_UPDATE', async () => {
    splitsEmitSpy.mockClear();
    readinessManager.splits.splitsArrived = true;
    storage.rbSegments.clear();

    const payload = { name: 'rbsegment', status: 'ACTIVE', changeNumber: 1684329854385, conditions: [] } as unknown as IRBSegment;
    const changeNumber = payload.changeNumber;

    await expect(splitChangesUpdater(undefined, undefined, { payload, changeNumber: changeNumber, type: RB_SEGMENT_UPDATE })).resolves.toBe(true);

    // Should emit SEGMENTS_UPDATE (not FLAGS_UPDATE) when only RB segment is updated
    expect(splitsEmitSpy).toBeCalledWith(SDK_SPLITS_ARRIVED, { type: SdkUpdateMetadataKeys.SEGMENTS_UPDATE, names: [] });
  });

  test('test with only RB segment update and no flags - should emit SEGMENTS_UPDATE', async () => {
    splitsEmitSpy.mockClear();
    readinessManager.splits.splitsArrived = true;
    storage.splits.clear();
    storage.rbSegments.clear();

    // Simulate a scenario where only RB segments are updated (no flags)
    const rbSegment = { name: 'rbsegment', status: 'ACTIVE', changeNumber: 1684329854385, conditions: [] } as unknown as IRBSegment;
    fetchMock.once('*', { status: 200, body: { rbs: { d: [rbSegment], t: 1684329854385 } } });
    await splitChangesUpdater();

    // When updatedFlags.length === 0, should emit SEGMENTS_UPDATE
    expect(splitsEmitSpy).toBeCalledWith(SDK_SPLITS_ARRIVED, { type: SdkUpdateMetadataKeys.SEGMENTS_UPDATE, names: [] });
  });

  test('test with both flags and RB segments updated - should emit FLAGS_UPDATE with flag names', async () => {
    splitsEmitSpy.mockClear();
    readinessManager.splits.splitsArrived = true;
    storage.splits.clear();
    storage.rbSegments.clear();
    storage.segments.clear();

    // Simulate a scenario where both flags and RB segments are updated
    const flag1 = { name: 'flag1', status: 'ACTIVE', changeNumber: 400, conditions: [] } as unknown as ISplit;
    const flag2 = { name: 'flag2', status: 'ACTIVE', changeNumber: 401, conditions: [] } as unknown as ISplit;
    const rbSegment = { name: 'rbsegment', status: 'ACTIVE', changeNumber: 1684329854385, conditions: [] } as unknown as IRBSegment;

    fetchMock.once('*', { status: 200, body: { ff: { d: [flag1, flag2], t: 401 }, rbs: { d: [rbSegment], t: 1684329854385 } } });
    await splitChangesUpdater();

    // When both flags and RB segments are updated, should emit FLAGS_UPDATE with flag names
    expect(splitsEmitSpy).toBeCalledWith(SDK_SPLITS_ARRIVED, { type: SdkUpdateMetadataKeys.FLAGS_UPDATE, names: ['flag1', 'flag2'] });
  });

  test('test client-side behavior - should emit even when segments not all fetched', async () => {
    splitsEmitSpy.mockClear();
    storage.splits.clear();
    // Start with splitsArrived = false so it emits on first update
    readinessManager.splits.splitsArrived = false;
    readinessManager.segments.segmentsArrived = false; // Segments not ready - client-side should still emit

    // Create client-side updater (isClientSide = true)
    const clientSideUpdater = splitChangesUpdaterFactory(loggerMock, splitChangesFetcher, storage, splitFiltersValidation, readinessManager.splits, 1000, 1, true);

    const flag1 = { name: 'client-flag', status: 'ACTIVE', changeNumber: 300, conditions: [] } as unknown as ISplit;
    fetchMock.once('*', { status: 200, body: { ff: { d: [flag1], t: 300 } } });
    await clientSideUpdater();

    // Client-side should emit even if segments aren't all fetched (isClientSide bypasses checkAllSegmentsExist)
    expect(splitsEmitSpy).toBeCalledWith(SDK_SPLITS_ARRIVED, { type: SdkUpdateMetadataKeys.FLAGS_UPDATE, names: ['client-flag'] });
  });

});
