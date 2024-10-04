import { MySegmentsUpdateWorker } from '../MySegmentsUpdateWorker';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';
import { syncTaskFactory } from '../../../syncTask';
import { Backoff } from '../../../../utils/Backoff';
import { telemetryTrackerFactory } from '../../../../trackers/telemetryTracker';
import { MEMBERSHIPS_LS_UPDATE, MEMBERSHIPS_MS_UPDATE } from '../../constants';

function storageMock() {
  return {
    segments: {
      _changeNumber: -1,
      getChangeNumber() {
        return this._changeNumber;
      }
    },
    largeSegments: {
      _changeNumber: -1,
      getChangeNumber() {
        return this._changeNumber;
      }
    },
  };
}

function mySegmentsSyncTaskMock(values: Array<boolean | undefined> = []) {

  const __mySegmentsUpdaterCalls: Array<{ res: (value?: boolean) => void }> = [];

  function __resolveMySegmentsUpdaterCall(value?: boolean) {
    if (__mySegmentsUpdaterCalls.length) __mySegmentsUpdaterCalls.shift()!.res(value); // resolve previous call
    else values.push(value);
  }

  // @ts-expect-error
  const syncTask = syncTaskFactory(
    { debug() { } }, // no-op logger
    () => {
      return new Promise((res) => {
        __mySegmentsUpdaterCalls.push({ res });
        if (values.length) __resolveMySegmentsUpdaterCall(values.shift());
      });
    },
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
    const mySegmentsSyncTask = mySegmentsSyncTaskMock();
    Backoff.__TEST__BASE_MILLIS = 1; // retry immediately
    const mySegmentUpdateWorker = MySegmentsUpdateWorker(loggerMock, storageMock() as any, mySegmentsSyncTask as any, telemetryTracker);

    // assert calling `mySegmentsSyncTask.execute` if `isExecuting` is false
    expect(mySegmentsSyncTask.isExecuting()).toBe(false);
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_MS_UPDATE, cn: 100 });
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1); // synchronizes MySegments if `isExecuting` is false

    // assert queueing changeNumber if `isExecuting` is true
    expect(mySegmentsSyncTask.isExecuting()).toBe(true);
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_MS_UPDATE, cn: 105 });
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_MS_UPDATE, cn: 104 });
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_MS_UPDATE, cn: 106 });
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
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_MS_UPDATE, cn: 110 });
    expect(mySegmentsSyncTask.isExecuting()).toBe(true);
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_MS_UPDATE, cn: 120 }, { added: [], removed: ['some_segment'] });
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1); // doesn't synchronize MySegments if `isExecuting` is true, even if payload (segmentList) is included
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith(undefined, true, undefined);

    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success
    await new Promise(res => setTimeout(res, 10));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(2); // re-synchronizes MySegments once previous event was handled
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith({ type: MEMBERSHIPS_MS_UPDATE, cn: 120, added: [], removed: ['some_segment'] }, true, undefined); // synchronizes MySegments with given segmentList
    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success
    await new Promise(res => setTimeout(res, 10));

    // assert handling an event without segmentList after one with segmentList
    mySegmentsSyncTask.execute.mockClear();
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_MS_UPDATE, cn: 130 }, { added: [], removed: ['other_segment'] });
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_MS_UPDATE, cn: 140 });
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1); // synchronizes MySegments once, until event is handled
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith({ type: MEMBERSHIPS_MS_UPDATE, cn: 130, added: [], removed: ['other_segment'] }, true, undefined);

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
    const mySegmentsSyncTask = mySegmentsSyncTaskMock([false, false, false]); // fetch fail
    const mySegmentUpdateWorker = MySegmentsUpdateWorker(loggerMock, storageMock() as any, mySegmentsSyncTask as any, telemetryTracker);

    // while fetch fails, should retry with backoff
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_MS_UPDATE, cn: 100 });
    await new Promise(res => setTimeout(res, Backoff.__TEST__BASE_MILLIS! * 3 + 100 /* some delay */));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(3);

    // if backoff is scheduled and a new event is queued, it must be handled immediately
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_MS_UPDATE, cn: 105 });
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(4);
  });

  test('stop', async () => {
    // setup
    const mySegmentsSyncTask = mySegmentsSyncTaskMock([false]);
    const mySegmentUpdateWorker = MySegmentsUpdateWorker(loggerMock, storageMock() as any, mySegmentsSyncTask as any, telemetryTracker);

    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_LS_UPDATE, cn: 100 });
    mySegmentUpdateWorker.stop();

    await new Promise(res => setTimeout(res, 20)); // Wait to assert no more calls to `execute` after stopping
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1);

    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_LS_UPDATE, cn: 150 }, undefined, 10);
    mySegmentUpdateWorker.stop();

    await new Promise(res => setTimeout(res, 20)); // Wait to assert no calls to `execute` after stopping (fetch request with delay is cleared)
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1);
  });

  test('put, with delay and storage change number', async () => {
    // setup
    Backoff.__TEST__BASE_MILLIS = 1; // retry immediately
    const mySegmentsSyncTask = mySegmentsSyncTaskMock();
    const storage = storageMock();
    const mySegmentUpdateWorker = MySegmentsUpdateWorker(loggerMock, storage as any, mySegmentsSyncTask as any, telemetryTracker);

    // notification with delay
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_LS_UPDATE, cn: 100 }, undefined, 50);

    // If a notification is queued while a fetch request is waiting, the notification is discarded but its change number is used to update the target change number
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_MS_UPDATE, cn: 150 }, undefined, 100); // target for segments storage is 150
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_LS_UPDATE, cn: 120 }); // target for large segments storage is 120

    await new Promise(res => setTimeout(res, 60));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1);
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith(undefined, true, undefined);
    storage.largeSegments._changeNumber = 100; // change number update but not the expected one
    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success

    await new Promise(res => setTimeout(res, 60));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(2); // fetch retry due to target change number mismatch

    storage.largeSegments._changeNumber = 120;
    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall();
    await new Promise(res => setTimeout(res, 60));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(2); // no more fetches since target change number is reached

    // If an event with segmentData (i.e., an instant update) is queued while a delayed fetch request is waiting, the instant update is discarded
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_LS_UPDATE, cn: 200 }, undefined, 50);
    await new Promise(res => setTimeout(res, 10));
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_LS_UPDATE, cn: 230 }, { added: ['some_segment'], removed: [] });

    await new Promise(res => setTimeout(res, 60));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(3);
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith(undefined, true, undefined);
    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success
    await new Promise(res => setTimeout(res));

    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_LS_UPDATE, cn: 250 }, { added: ['some_segment'], removed: [] });
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(4);
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith({ type: MEMBERSHIPS_LS_UPDATE, cn: 250, added: ['some_segment'], removed: [] }, true, undefined);

    // Stop should clear the delayed fetch request
    mySegmentUpdateWorker.put({ type: MEMBERSHIPS_MS_UPDATE, cn: 300 }, undefined, 10);
    mySegmentUpdateWorker.stop();
    await new Promise(res => setTimeout(res, 20));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(4);
  });
});
