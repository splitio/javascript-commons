import { readinessManagerFactory } from '../../../../readiness/readinessManager';
import { MySegmentsCacheInMemory } from '../../../../storages/inMemory/MySegmentsCacheInMemory';
import { mySegmentsUpdaterFactory } from '../mySegmentsUpdater';
import { fullSettings } from '../../../../utils/settingsValidation/__tests__/settings.mocks';
import { EventEmitter } from '../../../../utils/MinEvents';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';
import { IMySegmentsFetcher } from '../../fetchers/types';
import { IMembershipsResponse } from '../../../../dtos/types';
import { SDK_SEGMENTS_ARRIVED, SEGMENTS_UPDATE } from '../../../../readiness/constants';
import { MySegmentsData } from '../../types';
import { MEMBERSHIPS_MS_UPDATE } from '../../../streaming/constants';
import { IStorageSync } from '../../../../storages/types';
import { SplitsCacheInMemory } from '../../../../storages/inMemory/SplitsCacheInMemory';
import { RBSegmentsCacheInMemory } from '../../../../storages/inMemory/RBSegmentsCacheInMemory';

describe('mySegmentsUpdater', () => {
  const segments = new MySegmentsCacheInMemory();
  const largeSegments = new MySegmentsCacheInMemory();
  const splits = new SplitsCacheInMemory();
  const rbSegments = new RBSegmentsCacheInMemory();
  const storage: IStorageSync = {
    segments,
    largeSegments,
    splits,
    rbSegments,
    impressions: {} as any,
    events: {} as any,
    impressionCounts: {} as any,
    telemetry: undefined,
    uniqueKeys: {} as any,
    save: () => {},
    destroy: () => {}
  };
  const readinessManager = readinessManagerFactory(EventEmitter, fullSettings);
  const segmentsEmitSpy = jest.spyOn(readinessManager.segments, 'emit');

  beforeEach(() => {
    jest.clearAllMocks();
    storage.segments.clear();
    readinessManager.segments.segmentsArrived = false;
  });

  test('test with mySegments update - should emit SEGMENTS_UPDATE metadata', async () => {
    const mockMySegmentsFetcher: IMySegmentsFetcher = jest.fn().mockResolvedValue({
      ms: { 'segment1': true, 'segment2': true },
      ls: {}
    } as IMembershipsResponse);

    const mySegmentsUpdater = mySegmentsUpdaterFactory(
      loggerMock,
      mockMySegmentsFetcher,
      storage,
      readinessManager.segments,
      1000,
      1,
      'test-key'
    );

    await mySegmentsUpdater();

    expect(segmentsEmitSpy).toBeCalledWith(SDK_SEGMENTS_ARRIVED, { type: SEGMENTS_UPDATE, names: [] });
  });

  test('test with mySegments data payload - should emit SEGMENTS_UPDATE metadata', async () => {
    const segmentsData: MySegmentsData = {
      type: MEMBERSHIPS_MS_UPDATE,
      cn: 123,
      added: ['segment1', 'segment2'],
      removed: []
    };

    const mySegmentsUpdater = mySegmentsUpdaterFactory(
      loggerMock,
      jest.fn().mockResolvedValue({ ms: {}, ls: {} } as IMembershipsResponse),
      storage,
      readinessManager.segments,
      1000,
      1,
      'test-key'
    );

    await mySegmentsUpdater(segmentsData);

    expect(segmentsEmitSpy).toBeCalledWith(SDK_SEGMENTS_ARRIVED, { type: SEGMENTS_UPDATE, names: [] });
  });

  test('test with empty mySegments - should still emit SEGMENTS_UPDATE metadata', async () => {
    const mockMySegmentsFetcher: IMySegmentsFetcher = jest.fn().mockResolvedValue({
      ms: {},
      ls: {}
    } as IMembershipsResponse);

    const mySegmentsUpdater = mySegmentsUpdaterFactory(
      loggerMock,
      mockMySegmentsFetcher,
      storage,
      readinessManager.segments,
      1000,
      1,
      'test-key'
    );

    await mySegmentsUpdater();

    expect(segmentsEmitSpy).toBeCalledWith(SDK_SEGMENTS_ARRIVED, { type: SEGMENTS_UPDATE, names: [] });
  });
});
