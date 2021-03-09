// @ts-nocheck
import MySegmentsUpdateWorker from '../MySegmentsUpdateWorker';

function mySegmentsSyncTaskMock() {

  const __mySegmentsUpdaterCalls = [];

  function __segmentsUpdater() {
    return new Promise((res, rej) => { __mySegmentsUpdaterCalls.push({ res, rej }); });
  }

  let __isSynchronizingMySegments = false;

  function isExecuting() {
    return __isSynchronizingMySegments;
  }

  function execute() {
    __isSynchronizingMySegments = true;
    return __segmentsUpdater().finally(function () {
      __isSynchronizingMySegments = false;
    });
  }

  return {
    isExecuting: jest.fn(isExecuting),
    execute: jest.fn(execute),

    __resolveMySegmentsUpdaterCall(index, value) {
      __mySegmentsUpdaterCalls[index].res(value); // resolve previous call
    },
  };
}

describe('MySegmentsUpdateWorker', () => {

  test('put', (done) => {

    // setup
    const mySegmentsSyncTask = mySegmentsSyncTaskMock();

    const mySegmentUpdateWorker = new MySegmentsUpdateWorker(mySegmentsSyncTask);
    mySegmentUpdateWorker.backoff.baseMillis = 0; // retry immediately

    expect(mySegmentUpdateWorker.maxChangeNumber).toBe(0); // inits with not queued changeNumber (maxChangeNumber equals to 0)

    // assert calling `mySegmentsSyncTask.execute` if `isExecuting` is false
    expect(mySegmentsSyncTask.isExecuting()).toBe(false);
    mySegmentUpdateWorker.put(100);
    expect(mySegmentUpdateWorker.maxChangeNumber).toBe(100); // queues changeNumber if it is mayor than current maxChangeNumber
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1); // synchronizes MySegments if `isExecuting` is false

    // assert queueing changeNumber if `isExecuting` is true
    expect(mySegmentsSyncTask.isExecuting()).toBe(true);
    mySegmentUpdateWorker.put(105);
    mySegmentUpdateWorker.put(104);
    mySegmentUpdateWorker.put(106);
    expect(mySegmentsSyncTask.execute).toBeCalledTimes(1); // doesn't synchronize MySegments if `isExecuting` is true
    expect(mySegmentUpdateWorker.maxChangeNumber).toBe(106); // queues changeNumber if it is mayor than current maxChangeNumber

    // assert calling `mySegmentsSyncTask.execute` if previous call is resolved and a new changeNumber in queue
    mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(0); // fetch success
    setTimeout(() => {
      expect(mySegmentsSyncTask.execute).toBeCalledTimes(2); // re-synchronizes MySegments if `isExecuting` is false and queue is not empty
      expect(mySegmentUpdateWorker.maxChangeNumber).toBe(106); // maxChangeNumber
      expect(mySegmentUpdateWorker.backoff.attempts).toBe(0); // no retry scheduled if synchronization success (changeNumbers are the expected)

      // assert reschedule synchronization if fetch fails
      mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(1, false); // fetch fail
      setTimeout(() => {
        expect(mySegmentsSyncTask.execute).toBeCalledTimes(3); // recalls `synchronizeSegment` if synchronization fail (one changeNumber is not the expected)
        expect(mySegmentUpdateWorker.backoff.attempts).toBe(1); // retry scheduled since synchronization failed (one changeNumber is not the expected)

        // assert dequeueing changeNumber
        mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(2); // fetch success
        setTimeout(() => {
          expect(mySegmentsSyncTask.execute).toBeCalledTimes(3); // doesn't synchronize MySegments while queue is empty
          expect(mySegmentUpdateWorker.maxChangeNumber).toBe(106); // maxChangeNumber

          // assert handling an event with segmentList after an event without segmentList,
          // to validate the special case than the fetch associated to the first event is resolved after a second event with payload arrives
          mySegmentsSyncTask.execute.mockClear();
          expect(mySegmentsSyncTask.isExecuting()).toBe(false);
          mySegmentUpdateWorker.put(110);
          expect(mySegmentsSyncTask.isExecuting()).toBe(true);
          mySegmentUpdateWorker.put(120, ['some_segment']);
          expect(mySegmentsSyncTask.execute).toBeCalledTimes(1); // doesn't synchronize MySegments if `isExecuting` is true, even if payload (segmentList) is included

          mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(3); // fetch success
          setTimeout(() => {
            expect(mySegmentsSyncTask.execute).toBeCalledTimes(2); // re-synchronizes MySegments once previous event was handled
            expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith(['some_segment'], true); // synchronizes MySegments with given segmentList
            mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(4); // fetch success
            setTimeout(() => {
              expect(mySegmentUpdateWorker.currentChangeNumber).toBe(120); // currentChangeNumber updated

              // assert handling an event without segmentList after one with segmentList,
              // to validate the special case than the event-loop of a handled event with payload is run after a second event arrives
              mySegmentsSyncTask.execute.mockClear();
              mySegmentUpdateWorker.put(130, ['other_segment']);
              mySegmentUpdateWorker.put(140);
              expect(mySegmentsSyncTask.execute).toBeCalledTimes(1); // synchronizes MySegments once, until event is handled

              mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(5); // fetch success
              setTimeout(() => {
                expect(mySegmentsSyncTask.execute).toBeCalledTimes(2); // re-synchronizes MySegments once previous event was handled
                expect(mySegmentsSyncTask.execute).toHaveBeenLastCalledWith(undefined, true); // synchronizes MySegments without segmentList if the event doesn't have payload
                mySegmentsSyncTask.__resolveMySegmentsUpdaterCall(6); // fetch success
                setTimeout(() => {
                  expect(mySegmentUpdateWorker.currentChangeNumber).toBe(140); // currentChangeNumber updated

                  // assert restarting retries, when a newer event is queued
                  mySegmentUpdateWorker.put(150); // queued
                  expect(mySegmentUpdateWorker.backoff.attempts).toBe(0); // backoff scheduler for retries is reset if a new event is queued

                  done();
                });
              });
            });
          });
        });

      }, 10); // wait a little bit until `mySegmentsSyncTask.execute` is called in next event-loop cycle
    });
  });

});
