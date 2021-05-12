import { ISplit } from '../../../../dtos/types';
import { readinessManagerFactory } from '../../../../readiness/readinessManager';
import { splitApiFactory } from '../../../../services/splitApi';
import SegmentsCacheInMemory from '../../../../storages/inMemory/SegmentsCacheInMemory';
import SplitsCacheInMemory from '../../../../storages/inMemory/SplitsCacheInMemory';
import splitChangesFetcherFactory from '../../fetchers/splitChangesFetcher';
import { splitChangesUpdaterFactory, computeSplitsMutation } from '../splitChangesUpdater';
import splitChangesMock1 from '../../../../__tests__/mocks/splitchanges.since.-1.json';
import fetchMock from '../../../../__tests__/testUtils/fetchMock';
import { settingsSplitApi } from '../../../../utils/settingsValidation/__tests__/settings.mocks';
import EventEmitter from '../../../../utils/MinEvents';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';

const activeSplit = {
  name: 'Split1',
  status: 'ACTIVE'
};

const archivedSplit = {
  name: 'Split2',
  status: 'ARCHIVED'
};

test('splitChangesUpdater / compute splits mutation', () => {

  const splitsMutation = computeSplitsMutation([activeSplit, archivedSplit] as ISplit[]);

  expect(splitsMutation.added).toEqual([[activeSplit.name, JSON.stringify(activeSplit)]]);
  expect(splitsMutation.removed).toEqual([archivedSplit.name]);
});

test('splitChangesUpdater / factory', (done) => {

  fetchMock.once('*', { status: 200, body: splitChangesMock1 }); // @ts-ignore
  const splitApi = splitApiFactory(settingsSplitApi, { getFetch: () => fetchMock, EventEmitter });
  const splitChangesFetcher = splitChangesFetcherFactory(splitApi.fetchSplitChanges);

  const splitsCache = new SplitsCacheInMemory();
  const setChangeNumber = jest.spyOn(splitsCache, 'setChangeNumber');
  const addSplits = jest.spyOn(splitsCache, 'addSplits');
  const removeSplits = jest.spyOn(splitsCache, 'removeSplits');

  const segmentsCache = new SegmentsCacheInMemory(splitsCache);
  const getRegisteredSegments = jest.spyOn(segmentsCache, 'getRegisteredSegments');
  const readinessManager = readinessManagerFactory(EventEmitter);
  const splitsEmitSpy = jest.spyOn(readinessManager.splits, 'emit');

  const splitChangesUpdater = splitChangesUpdaterFactory(loggerMock, splitChangesFetcher, splitsCache, segmentsCache, readinessManager.splits, 1000, 1);

  splitChangesUpdater().then((result) => {
    expect(setChangeNumber).toBeCalledTimes(1);
    expect(setChangeNumber).lastCalledWith(splitChangesMock1.till);
    expect(addSplits).toBeCalledTimes(1);
    expect(addSplits.mock.calls[0][0].length).toBe(splitChangesMock1.splits.length);
    expect(removeSplits).toBeCalledTimes(1);
    expect(removeSplits).lastCalledWith([]);
    expect(getRegisteredSegments).toBeCalledTimes(0);
    expect(splitsEmitSpy).toBeCalledWith('state::splits-arrived');
    expect(result).toBe(true);
    done();
  });

});
