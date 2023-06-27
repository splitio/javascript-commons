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

test('splitChangesUpdater / segments parser', () => {

  const segments = parseSegments(activeSplitWithSegments as ISplit);

  expect(segments.has('A')).toBe(true);
  expect(segments.has('B')).toBe(true);
});

test('splitChangesUpdater / compute splits mutation', () => {

  const splitsMutation = computeSplitsMutation([activeSplitWithSegments, archivedSplit] as ISplit[]);

  expect(splitsMutation.added).toEqual([[activeSplitWithSegments.name, activeSplitWithSegments]]);
  expect(splitsMutation.removed).toEqual([archivedSplit.name]);
  expect(splitsMutation.segments).toEqual(['A', 'B']);
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

  const splitChangesUpdater = splitChangesUpdaterFactory(loggerMock, splitChangesFetcher, splitsCache, segmentsCache, readinessManager.splits, 1000, 1);

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
    const ARCHIVED_FF = 'ARCHIVED';
    let index = 0;
    for (const notification of splitNotifications) {
      const payload = notification.decoded as ISplit;
      const changeNumber = payload.changeNumber;

      await expect(splitChangesUpdater(undefined, undefined, { payload, changeNumber: changeNumber })).resolves.toBe(true);
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
