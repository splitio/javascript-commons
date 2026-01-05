import { readinessManagerFactory } from '../../../../readiness/readinessManager';
import { SegmentsCacheInMemory } from '../../../../storages/inMemory/SegmentsCacheInMemory';
import { segmentChangesUpdaterFactory } from '../segmentChangesUpdater';
import { fullSettings } from '../../../../utils/settingsValidation/__tests__/settings.mocks';
import { EventEmitter } from '../../../../utils/MinEvents';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';
import { ISegmentChangesFetcher } from '../../fetchers/types';
import { ISegmentChangesResponse } from '../../../../dtos/types';
import { SDK_SEGMENTS_ARRIVED } from '../../../../readiness/constants';

describe('segmentChangesUpdater', () => {
  const segments = new SegmentsCacheInMemory();
  const updateSegments = jest.spyOn(segments, 'update');

  const readinessManager = readinessManagerFactory(EventEmitter, fullSettings);
  const segmentsEmitSpy = jest.spyOn(readinessManager.segments, 'emit');

  beforeEach(() => {
    jest.clearAllMocks();
    segments.clear();
    readinessManager.segments.segmentsArrived = false;
  });

  test('test with segments update - should emit updatedSegments and NOT updatedFlags', async () => {
    const segmentName = 'test-segment';
    const segmentChange: ISegmentChangesResponse = {
      name: segmentName,
      added: ['key1', 'key2'],
      removed: [],
      since: -1,
      till: 123
    };

    const mockSegmentChangesFetcher: ISegmentChangesFetcher = jest.fn().mockResolvedValue([segmentChange]);

    const segmentChangesUpdater = segmentChangesUpdaterFactory(
      loggerMock,
      mockSegmentChangesFetcher,
      segments,
      readinessManager,
      1000,
      1
    );

    segments.registerSegments([segmentName]);

    await segmentChangesUpdater(undefined, segmentName);

    expect(updateSegments).toHaveBeenCalledWith(segmentName, segmentChange.added, segmentChange.removed, segmentChange.till);
    expect(segmentsEmitSpy).toBeCalledWith(SDK_SEGMENTS_ARRIVED, { updatedSegments: [segmentName] });
  });
});
