// @ts-nocheck
import { SegmentsCacheInMemory } from '../../../../storages/inMemory/SegmentsCacheInMemory';
import { SegmentsUpdateWorker } from '../SegmentsUpdateWorker';
import { FETCH_BACKOFF_MAX_RETRIES } from '../constants';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';

function segmentsSyncTaskMock(segmentsStorage, changeNumbers: Record<string, number>[]) {

  const __segmentsUpdaterCalls = [];

  function __resolveSegmentsUpdaterCall(changeNumber: Record<string, number>) {
    Object.keys(changeNumber).forEach(segmentName => {
      segmentsStorage.setChangeNumber(segmentName, changeNumber[segmentName]); // update changeNumber in storage
    });
    __segmentsUpdaterCalls.shift().res(); // resolve `execute` call
  }

  let __isSynchronizingSegments = false;

  function isExecuting() {
    return __isSynchronizingSegments;
  }

  function execute() {
    __isSynchronizingSegments = true;
    return new Promise((res) => {
      __segmentsUpdaterCalls.push({ res });
      if (changeNumbers && changeNumbers.length) __resolveSegmentsUpdaterCall(changeNumbers.shift());
    }).then(function () {
      __isSynchronizingSegments = false;
    });
  }

  return {
    isExecuting: jest.fn(isExecuting),
    execute: jest.fn(execute),

    __resolveSegmentsUpdaterCall
  };
}

describe('SegmentsUpdateWorker ', () => {

  test('put', async () => {

    // setup
    const cache = new SegmentsCacheInMemory();
    cache.addToSegment('mocked_segment_1', ['a', 'b', 'c']);
    cache.addToSegment('mocked_segment_2', ['d']);
    cache.addToSegment('mocked_segment_3', ['e']);
    const segmentsSyncTask = segmentsSyncTaskMock(cache);

    const segmentsUpdateWorker = new SegmentsUpdateWorker(loggerMock, segmentsSyncTask, cache);
    segmentsUpdateWorker.backoff.baseMillis = 0; // retry immediately

    expect(segmentsUpdateWorker.maxChangeNumbers).toEqual({}); // inits with not queued events;

    // assert calling `segmentsSyncTask.execute` if `isExecuting` is false
    expect(segmentsSyncTask.isExecuting()).toBe(false);
    segmentsUpdateWorker.put({ changeNumber: 100, segmentName: 'mocked_segment_1' });
    expect(segmentsUpdateWorker.maxChangeNumbers).toEqual({ 'mocked_segment_1': 100 }); // queues events (changeNumbers) if they are mayor than storage changeNumbers and maxChangeNumbers
    expect(segmentsSyncTask.execute).toBeCalledTimes(1); // synchronizes segment if `isExecuting` is false
    expect(segmentsSyncTask.execute.mock.calls).toEqual([[['mocked_segment_1'], true, false, undefined]]); // synchronizes segment with given name

    // assert queueing items if `isExecuting` is true
    expect(segmentsSyncTask.isExecuting()).toBe(true);
    segmentsUpdateWorker.put({ changeNumber: 95, segmentName: 'mocked_segment_1' });
    segmentsUpdateWorker.put({ changeNumber: 100, segmentName: 'mocked_segment_2' });
    segmentsUpdateWorker.put({ changeNumber: 105, segmentName: 'mocked_segment_1' });
    segmentsUpdateWorker.put({ changeNumber: 94, segmentName: 'mocked_segment_1' });
    segmentsUpdateWorker.put({ changeNumber: 94, segmentName: 'mocked_segment_3' });

    expect(segmentsUpdateWorker.maxChangeNumbers).toEqual({ 'mocked_segment_1': 105, 'mocked_segment_2': 100, 'mocked_segment_3': 94 }); // queues events
    expect(segmentsSyncTask.execute).toBeCalledTimes(1); // doesn't synchronize segment if `isExecuting` is true

    // assert dequeueing and recalling to `segmentsSyncTask.execute`
    segmentsSyncTask.__resolveSegmentsUpdaterCall({ 'mocked_segment_1': 100 }); // resolve first call to `segmentsSyncTask.execute`
    await new Promise(res => setTimeout(res));
    expect(cache.getChangeNumber('mocked_segment_1')).toBe(100); // 100
    expect(segmentsSyncTask.execute).toBeCalledTimes(2); // re-synchronizes segment if `isExecuting` is false and queue is not empty
    expect(segmentsSyncTask.execute).toHaveBeenLastCalledWith(['mocked_segment_1', 'mocked_segment_2', 'mocked_segment_3'], true, false, undefined); // synchronizes segments with given names
    expect(segmentsUpdateWorker.backoff.attempts).toBe(0); // no retry scheduled if synchronization success (changeNumbers are the expected)

    // assert not rescheduling synchronization if some changeNumber is not updated as expected,
    // but rescheduling if a new item was queued with a greater changeNumber while the fetch was pending.
    segmentsUpdateWorker.put({ changeNumber: 110, segmentName: 'mocked_segment_1' });
    segmentsSyncTask.__resolveSegmentsUpdaterCall({ 'mocked_segment_1': 100, 'mocked_segment_2': 100, 'mocked_segment_3': 94 });
    await new Promise(res => setTimeout(res));
    expect(segmentsSyncTask.execute).toBeCalledTimes(3); // re-synchronizes segment if a new item was queued with a greater changeNumber while the fetch was pending
    expect(segmentsSyncTask.execute).toHaveBeenLastCalledWith(['mocked_segment_1'], true, false, undefined); // synchronizes segment that was queued with a greater changeNumber while the fetch was pending
    expect(segmentsUpdateWorker.backoff.attempts).toBe(0); // doesn't retry backoff schedule since a new item was queued

    // assert dequeueing remaining events
    segmentsSyncTask.__resolveSegmentsUpdaterCall({ 'mocked_segment_1': 105 }); // resolve third call to `segmentsSyncTask.execute`
    await new Promise(res => setTimeout(res));
    expect(segmentsSyncTask.execute).toBeCalledTimes(3); // doesn't re-synchronize segment if fetched changeNumbers are not the expected (i.e., are different from the queued items)
    expect(segmentsUpdateWorker.maxChangeNumbers).toEqual({ 'mocked_segment_1': 110, 'mocked_segment_2': 100, 'mocked_segment_3': 94 }); // maxChangeNumbers were cleaned

    // assert restarting retries, when a newer event is queued
    segmentsUpdateWorker.put({ changeNumber: 115, segmentName: 'mocked_segment_1' }); // queued
    expect(segmentsUpdateWorker.backoff.attempts).toBe(0); // backoff scheduler for retries is reset if a new event is queued
  });

  test('put, completed with CDN bypass', async () => {

    // setup
    const cache = new SegmentsCacheInMemory();
    const segmentsSyncTask = segmentsSyncTaskMock(cache, [
      ...Array(FETCH_BACKOFF_MAX_RETRIES + 1).fill({ 'mocked_segment_1': 90 }),
      { 'mocked_segment_1': 100 }
    ]); // 12 executions. Last one is valid
    const segmentsUpdateWorker = new SegmentsUpdateWorker(loggerMock, segmentsSyncTask, cache);
    segmentsUpdateWorker.backoff.baseMillis /= 1000; // 10 millis instead of 10 sec
    segmentsUpdateWorker.backoff.maxMillis /= 1000; // 60 millis instead of 1 min

    segmentsUpdateWorker.put({ changeNumber: 100, segmentName: 'mocked_segment_1' }); // queued

    await new Promise(res => setTimeout(res, 540)); // 440 + some delay

    expect(loggerMock.debug).lastCalledWith('Refresh completed bypassing the CDN in 2 attempts.');
    expect(segmentsSyncTask.execute.mock.calls).toEqual([
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill([['mocked_segment_1'], true, false, undefined]),
      ...Array(2).fill([['mocked_segment_1'], true, false, [100]])
    ]); // `execute` was called 12 times. Last 2 with CDN bypass
  });


  test('put, not completed with CDN bypass', async () => {

    // setup
    const cache = new SegmentsCacheInMemory();
    const segmentsSyncTask = segmentsSyncTaskMock(cache, Array(FETCH_BACKOFF_MAX_RETRIES * 2).fill({ 'mocked_segment_1': 90 })); // 20 executions. No one is valid
    const segmentsUpdateWorker = new SegmentsUpdateWorker(loggerMock, segmentsSyncTask, cache);
    segmentsUpdateWorker.backoff.baseMillis /= 1000; // 10 millis instead of 10 sec
    segmentsUpdateWorker.backoff.maxMillis /= 1000; // 60 millis instead of 1 min

    segmentsUpdateWorker.put({ changeNumber: 100, segmentName: 'mocked_segment_1' }); // queued

    await new Promise(res => setTimeout(res, 960)); // 860 + some delay

    expect(loggerMock.debug).lastCalledWith('No changes fetched after 10 attempts with CDN bypassed.');
    expect(segmentsSyncTask.execute.mock.calls).toEqual([
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill([['mocked_segment_1'], true, false, undefined]),
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill([['mocked_segment_1'], true, false, [100]]),
    ]); // `execute` was called 20 times. Last 10 with CDN bypass
  });

});
