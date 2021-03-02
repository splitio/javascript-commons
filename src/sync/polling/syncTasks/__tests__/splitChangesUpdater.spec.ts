import { ISplit } from '../../../../dtos/types';
import { readinessManagerFactory } from '../../../../readiness/readinessManager';
import { splitApiFactory } from '../../../../services/splitApi';
import SegmentsCacheInMemory from '../../../../storages/inMemory/SegmentsCacheInMemory';
import SplitsCacheInMemory from '../../../../storages/inMemory/SplitsCacheInMemory';
import splitChangesFetcherFactory from '../../fetchers/splitChangesFetcher';
import { splitChangesUpdaterFactory, parseSegments, computeSplitsMutation } from '../splitsSyncTask';
import splitChangesMock1 from '../../../../__tests__/mocks/splitchanges.since.-1.json';
import fetchMock from '../../../../__tests__/testUtils/fetchMock';
import { settingsSplitApi } from '../../../../utils/settingsValidation/__tests__/settings.mocks';
import EventEmitter from '../../../../utils/MinEvents';

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

  expect(splitsMutation.added).toEqual([[activeSplitWithSegments.name, JSON.stringify(activeSplitWithSegments)]]);
  expect(splitsMutation.removed).toEqual([archivedSplit.name]);
  expect(splitsMutation.segments).toEqual(['A', 'B']);
});

test('splitChangesUpdater / factory', (done) => {

  fetchMock.once('*', { status: 200, body: splitChangesMock1 });
  const splitApi = splitApiFactory(settingsSplitApi, { getFetch: () => fetchMock, EventEmitter });
  const splitChangesFetcher = splitChangesFetcherFactory(splitApi.fetchSplitChanges);

  const splitsCache = new SplitsCacheInMemory();
  const setChangeNumber = jest.spyOn(splitsCache, 'setChangeNumber');
  const addSplits = jest.spyOn(splitsCache, 'addSplits');
  const removeSplits = jest.spyOn(splitsCache, 'removeSplits');

  const segmentsCache = new SegmentsCacheInMemory();
  const registerSegments = jest.spyOn(segmentsCache, 'registerSegments');
  const readinessManager = readinessManagerFactory(EventEmitter);
  const splitsEmitSpy = jest.spyOn(readinessManager.splits, 'emit');

  const splitChangesUpdater = splitChangesUpdaterFactory(splitChangesFetcher, splitsCache, segmentsCache, readinessManager.splits, 1000, 1);

  splitChangesUpdater().then((result) => {
    expect(setChangeNumber.mock.calls.length).toBe(1);
    expect(setChangeNumber).lastCalledWith(splitChangesMock1.till);
    expect(addSplits.mock.calls.length).toBe(1);
    expect(addSplits.mock.calls[0][0].length).toBe(splitChangesMock1.splits.length);
    expect(removeSplits.mock.calls.length).toBe(1);
    expect(removeSplits).lastCalledWith([]);
    expect(registerSegments).toBeCalledTimes(1);
    expect(splitsEmitSpy).toBeCalledWith('SDK_SPLITS_ARRIVED');
    expect(result).toBe(true);
    done();
  });

});
