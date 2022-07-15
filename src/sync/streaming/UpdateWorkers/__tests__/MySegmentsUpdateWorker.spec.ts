// @ts-nocheck
import { MySegmentsUpdateWorker } from '../MySegmentsUpdateWorker';
import { syncTaskFactory } from '../../../syncTask';
import { Backoff } from '../../../../utils/Backoff';

function mySegmentsSyncTaskMock(values = []) {

  const __mySegmentsUpdaterCalls = [];

  function __resolveMySegmentsUpdaterCall(value) {
    if (__mySegmentsUpdaterCalls.length)  __mySegmentsUpdaterCalls.shift().res(value); // resolve previous call
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

describe('MySegmentsUpdateWorker', () => {

  test('put', async () => {

    // setup
    const mySegmentsSyncTask = mySegmentsSyncTaskMock();
    Backoff.__TEST__BASE_MILLIS = 1; // retry immediately
    const mySegmentUpdateWorker = MySegmentsUpdateWorker(mySegmentsSyncTask);

    // assert calling `mySegmentsSyncTask.execute` if `isExecuting` is false
    expect(mySegmentsSyncTask.isExecuting()).toBe(false);
    mySegmentUpdateWorker.put(100);
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1); // synchronizes MySegments if `isExecuting` is false

    // assert queueing changeNumber if `isExecuting` is true
    expect(mySegmentsSyncTask.isExecuting()).toBe(true);
    mySegmentUpdateWorker.put(105);
    mySegmentUpdateWorker.put(104);
    mySegmentUpdateWorker.put(106);
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
    expect(mySegmentsSyncTask.execute.mock.calls).toEqual([[undefined, true], [undefined, true], [undefined, true]]);

    // assert handling an event with segmentList after an event without segmentList,
    // to validate the special case than the fetch associated to the first event is resolved after a second event with payload arrives
    mySegmentsSyncTask.execute.mockClear();
    expect(mySegmentsSyncTask.isExecuting()).toBe(false);
    mySegmentUpdateWorker.put(110);
    expect(mySegmentsSyncTask.isExecuting()).toBe(true);
    mySegmentUpdateWorker.put(120, ['some_segment']);
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1); // doesn't synchronize MySegments if `isExecuting` is true, even if payload (segmentList) is included
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith(undefined, true);

    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success
    await new Promise(res => setTimeout(res, 10));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(2); // re-synchronizes MySegments once previous event was handled
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith(['some_segment'], true); // synchronizes MySegments with given segmentList
    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success
    await new Promise(res => setTimeout(res, 10));

    // assert handling an event without segmentList after one with segmentList
    mySegmentsSyncTask.execute.mockClear();
    mySegmentUpdateWorker.put(130, ['other_segment']);
    mySegmentUpdateWorker.put(140);
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1); // synchronizes MySegments once, until event is handled
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith(['other_segment'], true);

    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success
    await new Promise(res => setTimeout(res));
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(2); // re-synchronizes MySegments once previous event was handled
    expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith(undefined, true); // synchronizes MySegments without segmentList if the event doesn't have payload

    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(); // fetch success
    await new Promise(res => setTimeout(res, 20)); // Wait to assert no more calls with backoff to `execute`
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(2);
  });

  test('stop', async () => {
    // setup
    const mySegmentsSyncTask = mySegmentsSyncTaskMock([false]);
    Backoff.__TEST__BASE_MILLIS = 1;
    const mySegmentUpdateWorker = MySegmentsUpdateWorker(mySegmentsSyncTask);

    mySegmentUpdateWorker.put(100);

    mySegmentUpdateWorker.stop();

    await new Promise(res => setTimeout(res, 20)); // Wait to assert no more calls to `execute` after reseting
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1);
  });

});
