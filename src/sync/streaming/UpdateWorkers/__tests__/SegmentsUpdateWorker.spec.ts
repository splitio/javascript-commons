// @ts-nocheck
import { SegmentsCacheInMemory } from '../../../../storages/inMemory/SegmentsCacheInMemory';
import { SegmentsUpdateWorker } from '../SegmentsUpdateWorker';
import { FETCH_BACKOFF_MAX_RETRIES } from '../constants';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';
import { Backoff } from '../../../../utils/Backoff';

function segmentsSyncTaskMock(segmentsStorage: SegmentsCacheInMemory, changeNumbers?: [segmentName: string, changeNumber: number][]) {

  const __segmentsUpdaterCalls = [];

  function __resolveUpdateSegmentCall(segmentName: string, changeNumber: number) {
    segmentsStorage.setChangeNumber(segmentName, changeNumber); // update changeNumber in storage

    __segmentsUpdaterCalls.shift().res(); // resolve `updateSegment` call
  }

  function updateSegment() {
    return new Promise((res) => {
      __segmentsUpdaterCalls.push({ res });
      if (changeNumbers && changeNumbers.length) __resolveUpdateSegmentCall(...changeNumbers.shift());
    });
  }

  return {
    updateSegment: jest.fn(updateSegment),

    __resolveUpdateSegmentCall
  };
}

describe('SegmentsUpdateWorker ', () => {

  test('put', async () => {

    // setup
    const cache = new SegmentsCacheInMemory();
    const segmentsSyncTask = segmentsSyncTaskMock(cache);
    Backoff.__TEST__BASE_MILLIS = 1; // retry immediately
    const segmentsUpdateWorker = SegmentsUpdateWorker(loggerMock, segmentsSyncTask, cache);

    // assert calling `updateSegment`
    segmentsUpdateWorker.put({ changeNumber: 100, segmentName: 'mocked_segment_1' });
    expect(segmentsSyncTask.updateSegment).toBeCalledTimes(1);
    expect(segmentsSyncTask.updateSegment).toBeCalledWith('mocked_segment_1', true, false, undefined); // synchronizes segment if `isExecuting` is false

    // assert calling `updateSegment` for other segments while 1st `updateSegment` call is pending
    segmentsUpdateWorker.put({ changeNumber: 95, segmentName: 'mocked_segment_1' });
    segmentsUpdateWorker.put({ changeNumber: 100, segmentName: 'mocked_segment_2' });
    segmentsUpdateWorker.put({ changeNumber: 105, segmentName: 'mocked_segment_1' });
    segmentsUpdateWorker.put({ changeNumber: 94, segmentName: 'mocked_segment_1' });
    segmentsUpdateWorker.put({ changeNumber: 94, segmentName: 'mocked_segment_3' });

    expect(segmentsSyncTask.updateSegment).toBeCalledTimes(3); // synchronize 2 new segments: mocked_segment_2 and mocked_segment_3
    expect(segmentsSyncTask.updateSegment).toHaveBeenNthCalledWith(2, 'mocked_segment_2', true, false, undefined);
    expect(segmentsSyncTask.updateSegment).toHaveBeenNthCalledWith(3, 'mocked_segment_3', true, false, undefined);

    // assert recalling `updateSegment` for mocked_segment_1, if max changeNumber (105) is greater than stored one (100)
    segmentsSyncTask.__resolveUpdateSegmentCall('mocked_segment_1', 100); // resolve first call to `updateSegment`
    await new Promise(res => setTimeout(res));
    expect(cache.getChangeNumber('mocked_segment_1')).toBe(100); // 100
    expect(segmentsSyncTask.updateSegment).toBeCalledTimes(4);
    expect(segmentsSyncTask.updateSegment).toHaveBeenLastCalledWith('mocked_segment_1', true, false, undefined);

    // queue a new event for mocked_segment_1
    segmentsUpdateWorker.put({ changeNumber: 110, segmentName: 'mocked_segment_1' });

    segmentsSyncTask.__resolveUpdateSegmentCall('mocked_segment_2', 100);
    segmentsSyncTask.__resolveUpdateSegmentCall('mocked_segment_3', 94);
    segmentsSyncTask.__resolveUpdateSegmentCall('mocked_segment_1', 100);

    await new Promise(res => setTimeout(res));
    // `updateSegment` for mocked_segment_1 is called a 3rd time
    expect(segmentsSyncTask.updateSegment).toBeCalledTimes(5); // re-synchronizes segment if a new item was queued with a greater changeNumber while the fetch was pending
    expect(segmentsSyncTask.updateSegment).toHaveBeenLastCalledWith('mocked_segment_1', true, false, undefined); // synchronizes segment that was queued with a greater changeNumber while the fetch was pending

    segmentsSyncTask.__resolveUpdateSegmentCall('mocked_segment_1', 110); // resolve last call with target changeNumber
    await new Promise(res => setTimeout(res, 20)); // Wait to assert no more calls with backoff to `updateSegment`
    expect(segmentsSyncTask.updateSegment).toBeCalledTimes(5); // doesn't re-synchronize segments if fetched changeNumbers are the expected (i.e., are equal to queued changeNumbers)
  });

  test('put, completed with CDN bypass', async () => {

    // setup
    Backoff.__TEST__BASE_MILLIS = 10; // 10 millis instead of 10 sec
    Backoff.__TEST__MAX_MILLIS = 60; // 60 millis instead of 1 min
    const cache = new SegmentsCacheInMemory();
    const segmentsSyncTask = segmentsSyncTaskMock(cache, [
      ...Array(FETCH_BACKOFF_MAX_RETRIES + 1).fill(['mocked_segment_1', 90]),
      ['mocked_segment_1', 100]
    ]); // 12 executions. Last one is valid
    const segmentsUpdateWorker = SegmentsUpdateWorker(loggerMock, segmentsSyncTask, cache);

    segmentsUpdateWorker.put({ changeNumber: 100, segmentName: 'mocked_segment_1' }); // queued

    await new Promise(res => setTimeout(res, 540)); // 440 + some delay

    expect(loggerMock.debug).lastCalledWith('Refresh completed bypassing the CDN in 2 attempts.');
    expect(segmentsSyncTask.updateSegment.mock.calls).toEqual([
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill(['mocked_segment_1', true, false, undefined]),
      ...Array(2).fill(['mocked_segment_1', true, false, 100])
    ]); // `updateSegment` was called 12 times. Last 2 with CDN bypass
  });


  test('put, not completed with CDN bypass', async () => {

    // setup
    Backoff.__TEST__BASE_MILLIS = 10; // 10 millis instead of 10 sec
    Backoff.__TEST__MAX_MILLIS = 60; // 60 millis instead of 1 min
    const cache = new SegmentsCacheInMemory();
    const segmentsSyncTask = segmentsSyncTaskMock(cache, Array(FETCH_BACKOFF_MAX_RETRIES * 2).fill(['mocked_segment_1', 90])); // 20 executions. No one is valid
    const segmentsUpdateWorker = SegmentsUpdateWorker(loggerMock, segmentsSyncTask, cache);

    segmentsUpdateWorker.put({ changeNumber: 100, segmentName: 'mocked_segment_1' }); // queued

    await new Promise(res => setTimeout(res, 960)); // 860 + some delay

    expect(loggerMock.debug).lastCalledWith('No changes fetched after 10 attempts with CDN bypassed.');
    expect(segmentsSyncTask.updateSegment.mock.calls).toEqual([
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill(['mocked_segment_1', true, false, undefined]),
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill(['mocked_segment_1', true, false, 100]),
    ]); // `updateSegment` was called 20 times. Last 10 with CDN bypass
  });

});
