// @ts-nocheck
import { MySegmentsUpdateWorker } from '../MySegmentsUpdateWorker';
import { MySegmentsCacheInMemory } from '../../../../storages/inMemory/MySegmentsCacheInMemory';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';
import { syncTaskFactory } from '../../../syncTask';
import { Backoff } from '../../../../utils/Backoff';
import { telemetryTrackerFactory } from '../../../../trackers/telemetryTracker';

function mySegmentsSyncTaskMock(values = []) {

  const __mySegmentsUpdaterCalls = [];

  function __resolveMySegmentsUpdaterCall(value) {
    if (__mySegmentsUpdaterCalls.length) __mySegmentsUpdaterCalls.shift().res(value); // resolve previous call
    else values.push(value);
  }

  const syncTask = syncTaskFactory(
    { debug() { } }, // no-op logger
    () => {
      return new Promise((res) => {
        __mySegmentsUpdaterCalls.push({ res });
        if (values.length) __resolveMySegmentsUpdaterCall(values.shift());
      });
    }
  );

  return {
    isExecuting: jest.fn(syncTask.isExecuting),
    execute: jest.fn(syncTask.execute),

    __resolveMySegmentsUpdaterCall,
  };
}

const telemetryTracker = telemetryTrackerFactory(); // no-op telemetry tracker


describe('MySegmentsUpdateWorker', () => {

  afterEach(() => {
    Backoff.__TEST__BASE_MILLIS = undefined; // restore
  });

  test('put', async () => {

    // setup
    const mySegmentsCache = new MySegmentsCacheInMemory();
    const mySegmentsSyncTask = mySegmentsSyncTaskMock();
    Backoff.__TEST__BASE_MILLIS = 1; // retry immediately
    const mySegmentUpdateWorker = MySegmentsUpdateWorker(loggerMock, mySegmentsCache, mySegmentsSyncTask, telemetryTracker);

    // assert calling `mySegmentsSyncTask.execute` if `isExecuting` is false
    expect(mySegmentsSyncTask.isExecuting()).toBe(false);
    mySegmentUpdateWorker.put({ cn: 100 });
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1); // synchronizes MySegments if `isExecuting` is false

    // assert queueing changeNumber if `isExecuting` is true
    expect(mySegmentsSyncTask.isExecuting()).toBe(true);
    mySegmentUpdateWorker.put({ cn: 105 });
    mySegmentUpdateWorker.put({ cn: 104 });
    mySegmentUpdateWorker.put({ cn: 106 });
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1); // doesn't synchronize MySegments if `isExecuting` is true

    // assert calling `mySegmentsSyncTask.execute` if previous call is resolved and a new changeNumber in queue
    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success
    await new Promise(res => setTimeout(res));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(2); // re-synchronizes MySegments if `isExecuting` is false and queue is not empty

    // assert reschedule synchronization if fetch fails
    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(false); // fetch fail
    await new Promise(res => setTimeout(res, 10)); // wait a little bit until `mySegmentsSyncTask.execute` is called again with backoff
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(3); // recalls `synchronizeSegment` if synchronization fail (one changeNumber is not the expected)

    // assert dequeueing changeNumber
    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success
    await new Promise(res => setTimeout(res, 10));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(3); // doesn't synchronize MySegments while queue is empty
    expect(mySegmentsSyncTask.execute.mock.calls).toEqual([[undefined, true, undefined], [undefined, true, undefined], [undefined, true, undefined]]);

    // assert handling an event with segmentList after an event without segmentList,
    // to validate the special case than the fetch associated to the first event is resolved after a second event with payload arrives
    mySegmentsSyncTask.execute.mockClear();
    expect(mySegmentsSyncTask.isExecuting()).toBe(false);
    mySegmentUpdateWorker.put({ cn: 110 });
    expect(mySegmentsSyncTask.isExecuting()).toBe(true);
    mySegmentUpdateWorker.put({ cn: 120 }, { removed: ['some_segment'] });
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1); // doesn't synchronize MySegments if `isExecuting` is true, even if payload (segmentList) is included
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith(undefined, true, undefined);

    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success
    await new Promise(res => setTimeout(res, 10));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(2); // re-synchronizes MySegments once previous event was handled
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith({ cn: 120, removed: ['some_segment'] }, true, undefined); // synchronizes MySegments with given segmentList
    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success
    await new Promise(res => setTimeout(res, 10));

    // assert handling an event without segmentList after one with segmentList
    mySegmentsSyncTask.execute.mockClear();
    mySegmentUpdateWorker.put({ cn: 130 }, { removed: ['other_segment'] });
    mySegmentUpdateWorker.put({ cn: 140 });
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1); // synchronizes MySegments once, until event is handled
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith({ cn: 130, removed: ['other_segment'] }, true, undefined);

    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success
    await new Promise(res => setTimeout(res));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(2); // re-synchronizes MySegments once previous event was handled
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith(undefined, true, undefined); // synchronizes MySegments without segmentList if the event doesn't have payload

    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success
    await new Promise(res => setTimeout(res, 20)); // Wait to assert no more calls with backoff to `execute`
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(2);
  });

  test('put, backoff', async () => {
    // setup
    Backoff.__TEST__BASE_MILLIS = 50;
    const mySegmentsCache = new MySegmentsCacheInMemory();
    const mySegmentsSyncTask = mySegmentsSyncTaskMock([false, false, false]); // fetch fail
    const mySegmentUpdateWorker = MySegmentsUpdateWorker(loggerMock, mySegmentsCache, mySegmentsSyncTask, telemetryTracker);

    // while fetch fails, should retry with backoff
    mySegmentUpdateWorker.put({ cn: 100 });
    await new Promise(res => setTimeout(res, Backoff.__TEST__BASE_MILLIS * 3 + 100 /* some delay */));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(3);

    // if backoff is scheduled and a new event is queued, it must be handled immediately
    mySegmentUpdateWorker.put({ cn: 105 });
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(4);
  });

  test('stop', async () => {
    // setup
    const mySegmentsCache = new MySegmentsCacheInMemory();
    const mySegmentsSyncTask = mySegmentsSyncTaskMock([false]);
    const mySegmentUpdateWorker = MySegmentsUpdateWorker(loggerMock, mySegmentsCache, mySegmentsSyncTask, telemetryTracker);

    mySegmentUpdateWorker.put({ cn: 100 });
    mySegmentUpdateWorker.stop();

    await new Promise(res => setTimeout(res, 20)); // Wait to assert no more calls to `execute` after stopping
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1);

    mySegmentUpdateWorker.put({ cn: 150 }, undefined, 10);
    mySegmentUpdateWorker.stop();

    await new Promise(res => setTimeout(res, 20)); // Wait to assert no calls to `execute` after stopping (fetch request with delay is cleared)
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1);
  });

  test('put with delay', async () => {
    // setup
    const mySegmentsCache = new MySegmentsCacheInMemory();
    const mySegmentsSyncTask = mySegmentsSyncTaskMock();
    const mySegmentUpdateWorker = MySegmentsUpdateWorker(loggerMock, mySegmentsCache, mySegmentsSyncTask, telemetryTracker);

    // If a delayed fetch request is queued while another fetch request is waiting, it is discarded
    mySegmentUpdateWorker.put({ cn: 100 }, undefined, 50);
    mySegmentUpdateWorker.put({ cn: 150 }, undefined, 100);

    await new Promise(res => setTimeout(res, 60));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1);
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith(undefined, true, undefined);
    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success

    await new Promise(res => setTimeout(res, 60));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1);

    // If an event with segmentData (i.e., an instant update) is queued while a delayed fetch request is waiting, the instant update is discarded
    mySegmentUpdateWorker.put({ cn: 200 }, undefined, 50);
    await new Promise(res => setTimeout(res, 10));
    mySegmentUpdateWorker.put({ cn: 230 }, { added: ['some_segment'] });

    await new Promise(res => setTimeout(res, 60));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(2);
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith(undefined, true, undefined);
    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success
    await new Promise(res => setTimeout(res));

    mySegmentUpdateWorker.put({ cn: 250 }, { added: ['some_segment'] });
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(3);
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith({ cn: 250, added: ['some_segment'] }, true, undefined);
  });
});
