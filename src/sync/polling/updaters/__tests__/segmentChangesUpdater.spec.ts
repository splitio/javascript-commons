import { readinessManagerFactory } from '../../../../readiness/readinessManager';
import { SegmentsCacheInMemory } from '../../../../storages/inMemory/SegmentsCacheInMemory';
import { segmentChangesUpdaterFactory } from '../segmentChangesUpdater';
import { fullSettings } from '../../../../utils/settingsValidation/__tests__/settings.mocks';
import { EventEmitter } from '../../../../utils/MinEvents';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';
import { ISegmentChangesFetcher } from '../../fetchers/types';
import { ISegmentChangesResponse } from '../../../../dtos/types';
import { SDK_SEGMENTS_ARRIVED } from '../../../../readiness/constants';
import { SdkUpdateMetadataKeys } from '../../../../../types/splitio';

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
    expect(segmentsEmitSpy).toBeCalledWith(SDK_SEGMENTS_ARRIVED, { type: SdkUpdateMetadataKeys.SEGMENTS_UPDATE, names: [] });
  });

  test('test with multiple segments update - should emit SEGMENTS_UPDATE metadata once', async () => {
    const segment1 = 'segment1';
    const segment2 = 'segment2';
    const segment3 = 'segment3';

    const segmentChange1: ISegmentChangesResponse = {
      name: segment1,
      added: ['key1'],
      removed: [],
      since: -1,
      till: 100
    };

    const segmentChange2: ISegmentChangesResponse = {
      name: segment2,
      added: ['key2'],
      removed: [],
      since: -1,
      till: 101
    };

    const segmentChange3: ISegmentChangesResponse = {
      name: segment3,
      added: ['key3'],
      removed: [],
      since: -1,
      till: 102
    };

    const mockSegmentChangesFetcher: ISegmentChangesFetcher = jest.fn().mockResolvedValue([
      segmentChange1,
      segmentChange2,
      segmentChange3
    ]);

    const segmentChangesUpdater = segmentChangesUpdaterFactory(
      loggerMock,
      mockSegmentChangesFetcher,
      segments,
      readinessManager,
      1000,
      1
    );

    segments.registerSegments([segment1, segment2, segment3]);

    // Update all segments at once
    await segmentChangesUpdater(undefined);

    // Should emit once when all segments are updated
    expect(segmentsEmitSpy).toHaveBeenCalledTimes(1);
    expect(segmentsEmitSpy).toBeCalledWith(SDK_SEGMENTS_ARRIVED, { type: SdkUpdateMetadataKeys.SEGMENTS_UPDATE, names: [] });
  });

  test('test with empty segments - should still emit SEGMENTS_UPDATE metadata', async () => {
    const segmentName = 'empty-segment';
    const segmentChange: ISegmentChangesResponse = {
      name: segmentName,
      added: [],
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

    expect(segmentsEmitSpy).toBeCalledWith(SDK_SEGMENTS_ARRIVED, { type: SdkUpdateMetadataKeys.SEGMENTS_UPDATE, names: [] });
  });
});
