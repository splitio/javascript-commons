// @ts-nocheck
import { SegmentsCacheInMemory } from '../../../../storages/inMemory/SegmentsCacheInMemory';
import { SegmentsUpdateWorker } from '../SegmentsUpdateWorker';
import { FETCH_BACKOFF_MAX_RETRIES } from '../constants';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';
import { Backoff } from '../../../../utils/Backoff';
import { syncTaskFactory } from '../../../syncTask';

function segmentsSyncTaskMock(segmentsStorage, changeNumbers: Record<string, number>[] = []) {

  const __segmentsUpdaterCalls = [];

  function __resolveSegmentsUpdaterCall(changeNumber: Record<string, number>) {
    Object.keys(changeNumber).forEach(segmentName => {
      segmentsStorage.setChangeNumber(segmentName, changeNumber[segmentName]); // update changeNumber in storage
    });
    if (__segmentsUpdaterCalls.length) __segmentsUpdaterCalls.shift().res(); // resolve `execute` call
    else changeNumbers.push(changeNumber);
  }

  const syncTask = syncTaskFactory(
    { debug() { } }, // no-op logger
    () => {
      return new Promise((res) => {
        __segmentsUpdaterCalls.push({ res });
        if (changeNumbers.length) __resolveSegmentsUpdaterCall(changeNumbers.shift());
      });
    }
  );

  return {
    isExecuting: jest.fn(syncTask.isExecuting),
    execute: jest.fn(syncTask.execute),

    __resolveSegmentsUpdaterCall
  };
}

describe('SegmentsUpdateWorker ', () => {

  test('put', async () => {

    // setup
    const cache = new SegmentsCacheInMemory();
    const segmentsSyncTask = segmentsSyncTaskMock(cache);
    Backoff.__TEST__BASE_MILLIS = 1; // retry immediately
    const segmentsUpdateWorker = SegmentsUpdateWorker(loggerMock, segmentsSyncTask, cache);

    // assert calling `segmentsSyncTask.execute`
    expect(segmentsSyncTask.isExecuting()).toBe(false);
    segmentsUpdateWorker.put({ changeNumber: 100, segmentName: 'mocked_segment_1' });
    expect(segmentsSyncTask.execute).toBeCalledTimes(1);
    expect(segmentsSyncTask.execute).toBeCalledWith(false, 'mocked_segment_1', true, undefined); // synchronizes segment with given name

    // assert calling `segmentsSyncTask` for other segments while 1st call is pending
    expect(segmentsSyncTask.isExecuting()).toBe(true);
    segmentsUpdateWorker.put({ changeNumber: 95, segmentName: 'mocked_segment_1' });
    segmentsUpdateWorker.put({ changeNumber: 100, segmentName: 'mocked_segment_2' });
    segmentsUpdateWorker.put({ changeNumber: 105, segmentName: 'mocked_segment_1' });
    segmentsUpdateWorker.put({ changeNumber: 94, segmentName: 'mocked_segment_1' });
    segmentsUpdateWorker.put({ changeNumber: 94, segmentName: 'mocked_segment_3' });

    expect(segmentsSyncTask.execute).toBeCalledTimes(3); // synchronize 2 new segments: mocked_segment_2 and mocked_segment_3
    expect(segmentsSyncTask.execute).toHaveBeenNthCalledWith(2, false, 'mocked_segment_2', true, undefined);
    expect(segmentsSyncTask.execute).toHaveBeenNthCalledWith(3, false, 'mocked_segment_3', true, undefined);

    // assert recalling `segmentsSyncTask.execute` for mocked_segment_1, if max changeNumber (105) is greater than stored one (100)
    segmentsSyncTask.__resolveSegmentsUpdaterCall({ 'mocked_segment_1': 100 }); // resolve first call to `segmentsSyncTask.execute`
    await new Promise(res => setTimeout(res));
    expect(cache.getChangeNumber('mocked_segment_1')).toBe(100);
    expect(segmentsSyncTask.execute).toBeCalledTimes(4);
    expect(segmentsSyncTask.execute).toHaveBeenLastCalledWith(false, 'mocked_segment_1', true, undefined);

    // handle a new event for mocked_segment_1
    segmentsUpdateWorker.put({ changeNumber: 110, segmentName: 'mocked_segment_1' });

    segmentsSyncTask.__resolveSegmentsUpdaterCall({ 'mocked_segment_2': 100 });
    segmentsSyncTask.__resolveSegmentsUpdaterCall({ 'mocked_segment_3': 94 });
    segmentsSyncTask.__resolveSegmentsUpdaterCall({ 'mocked_segment_1': 100 });

    await new Promise(res => setTimeout(res));
    // `updateSegment` for mocked_segment_1 is called a 3rd time
    expect(segmentsSyncTask.execute).toBeCalledTimes(5); // re-synchronizes segment if a new item was queued with a greater changeNumber while the fetch was pending
    expect(segmentsSyncTask.execute).toHaveBeenLastCalledWith(false, 'mocked_segment_1', true, undefined); // synchronizes segment that was queued with a greater changeNumber while the fetch was pending

    segmentsSyncTask.__resolveSegmentsUpdaterCall({ 'mocked_segment_1': 110 }); // resolve last call with target changeNumber
    await new Promise(res => setTimeout(res, 20)); // Wait to assert no more calls with backoff to `updateSegment`
    expect(segmentsSyncTask.execute).toBeCalledTimes(5); // doesn't re-synchronize segments if fetched changeNumbers are the expected (i.e., are equal to queued changeNumbers)
  });

  test('put, completed with CDN bypass', async () => {

    // setup
    Backoff.__TEST__BASE_MILLIS = 10; // 10 millis instead of 10 sec
    Backoff.__TEST__MAX_MILLIS = 60; // 60 millis instead of 1 min
    const cache = new SegmentsCacheInMemory();
    const segmentsSyncTask = segmentsSyncTaskMock(cache, [
      ...Array(FETCH_BACKOFF_MAX_RETRIES + 1).fill({ 'mocked_segment_1': 90 }),
      { 'mocked_segment_1': 100 }
    ]); // 12 executions. Last one is valid
    const segmentsUpdateWorker = SegmentsUpdateWorker(loggerMock, segmentsSyncTask, cache);

    segmentsUpdateWorker.put({ changeNumber: 100, segmentName: 'mocked_segment_1' }); // queued

    await new Promise(res => setTimeout(res, 540)); // 440 + some delay

    expect(loggerMock.debug).lastCalledWith('Refresh completed bypassing the CDN in 2 attempts.');
    expect(segmentsSyncTask.execute.mock.calls).toEqual([
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill([false, 'mocked_segment_1', true, undefined]),
      ...Array(2).fill([false, 'mocked_segment_1', true, 100])
    ]); // `execute` was called 12 times. Last 2 with CDN bypass
  });


  test('put, not completed with CDN bypass', async () => {

    // setup
    Backoff.__TEST__BASE_MILLIS = 10; // 10 millis instead of 10 sec
    Backoff.__TEST__MAX_MILLIS = 60; // 60 millis instead of 1 min
    const cache = new SegmentsCacheInMemory();
    const segmentsSyncTask = segmentsSyncTaskMock(cache, Array(FETCH_BACKOFF_MAX_RETRIES * 2).fill({ 'mocked_segment_1': 90 })); // 20 executions. No one is valid
    const segmentsUpdateWorker = SegmentsUpdateWorker(loggerMock, segmentsSyncTask, cache);

    segmentsUpdateWorker.put({ changeNumber: 100, segmentName: 'mocked_segment_1' }); // queued

    await new Promise(res => setTimeout(res, 960)); // 860 + some delay

    expect(loggerMock.debug).lastCalledWith('No changes fetched after 10 attempts with CDN bypassed.');
    expect(segmentsSyncTask.execute.mock.calls).toEqual([
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill([false, 'mocked_segment_1', true, undefined]),
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill([false, 'mocked_segment_1', true, 100]),
    ]); // `execute` was called 20 times. Last 10 with CDN bypass
  });

  test('stop', async () => {
    // setup
    const cache = new SegmentsCacheInMemory();
    const segmentsSyncTask = segmentsSyncTaskMock(cache, [['mocked_segment_1', 95], ['mocked_segment_2', 95]]);
    Backoff.__TEST__BASE_MILLIS = 1;
    const segmentsUpdateWorker = SegmentsUpdateWorker(loggerMock, segmentsSyncTask, cache);

    segmentsUpdateWorker.put({ changeNumber: 100, segmentName: 'mocked_segment_1' });
    segmentsUpdateWorker.put({ changeNumber: 100, segmentName: 'mocked_segment_2' });

    segmentsUpdateWorker.stop();

    await new Promise(res => setTimeout(res, 20)); // Wait to assert no more calls to `updateSegment` after reseting
    expect(segmentsSyncTask.updateSegment).toBeCalledTimes(2);
  });

});
