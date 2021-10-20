// @ts-nocheck
import { SDK_SPLITS_ARRIVED } from '../../../../readiness/constants';
import SplitsCacheInMemory from '../../../../storages/inMemory/SplitsCacheInMemory';
import SplitsUpdateWorker from '../SplitsUpdateWorker';

function splitsSyncTaskMock(splitStorage) {

  const __splitsUpdaterCalls = [];

  function __splitsUpdater() {
    return new Promise((res, rej) => { __splitsUpdaterCalls.push({ res, rej }); });
  }

  let __isSynchronizingSplits = false;

  function isExecuting() {
    return __isSynchronizingSplits;
  }

  function execute() {
    __isSynchronizingSplits = true;
    return __splitsUpdater().then(function () {
    }).finally(function () {
      __isSynchronizingSplits = false;
    });
  }

  return {
    isExecuting: jest.fn(isExecuting),
    execute: jest.fn(execute),

    __resolveSplitsUpdaterCall(index, changeNumber) {
      splitStorage.setChangeNumber(changeNumber); // update changeNumber in storage
      __splitsUpdaterCalls[index].res(); // resolve previous call
    },
  };
}

const splitsEventEmitterMock = {
  emit: jest.fn(),
};

function assertKilledSplit(cache, changeNumber, splitName, defaultTreatment) {
  const split = JSON.parse(cache.getSplit(splitName));
  expect(split.killed).toBe(true); // split must be killed
  expect(split.defaultTreatment).toBe(defaultTreatment); // split must have the given default treatment
  expect(split.changeNumber).toBe(changeNumber); // split must have the given change number
}

describe('SplitsUpdateWorker', () => {

  test('put', (done) => {

    // setup
    const cache = new SplitsCacheInMemory();
    const splitsSyncTask = splitsSyncTaskMock(cache);

    const splitUpdateWorker = new SplitsUpdateWorker(cache, splitsSyncTask);
    splitUpdateWorker.backoff.baseMillis = 0; // retry immediately

    expect(splitUpdateWorker.maxChangeNumber).toBe(0); // inits with not queued changeNumber (maxChangeNumber equals to 0)

    // assert calling `splitsSyncTask.execute` if `isExecuting` is false
    expect(splitsSyncTask.isExecuting()).toBe(false);
    splitUpdateWorker.put({ changeNumber: 100 }); // queued
    expect(splitUpdateWorker.maxChangeNumber).toBe(100); // queues changeNumber if it is mayor than storage changeNumber and maxChangeNumber
    expect(splitsSyncTask.execute).toBeCalledTimes(1); // synchronizes splits if `isExecuting` is false

    // assert queueing changeNumber if `isExecuting` is true
    expect(splitsSyncTask.isExecuting()).toBe(true);
    splitUpdateWorker.put({ changeNumber: 105 }); // queued
    splitUpdateWorker.put({ changeNumber: 104 }); // not queued
    splitUpdateWorker.put({ changeNumber: 106 }); // queued
    splitUpdateWorker.put({ changeNumber: 103 }); // not queued
    expect(splitsSyncTask.execute).toBeCalledTimes(1); // doesn't synchronize splits while `isExecuting` is true
    expect(splitUpdateWorker.maxChangeNumber).toBe(106); // queues changeNumber if it is mayor than currently maxChangeNumber and storage changeNumber

    // assert calling `splitsSyncTask.execute` if previous call is resolved and a new changeNumber in queue
    splitsSyncTask.__resolveSplitsUpdaterCall(0, 100);
    setTimeout(() => {
      expect(splitsSyncTask.execute).toBeCalledTimes(2); // re-synchronizes splits if `isExecuting` is false and queue is not empty
      expect(splitUpdateWorker.maxChangeNumber).toBe(106); // maxChangeNumber
      expect(splitUpdateWorker.backoff.attempts).toBe(0); // no retry scheduled if synchronization success (changeNumber is the expected)

      // assert reschedule synchronization if changeNumber is not updated as expected
      splitsSyncTask.__resolveSplitsUpdaterCall(1, 100);
      setTimeout(() => {
        expect(splitsSyncTask.execute).toBeCalledTimes(3); // re-synchronizes splits if synchronization fail (changeNumber is not the expected)
        expect(splitUpdateWorker.maxChangeNumber).toBe(106); // maxChangeNumber
        expect(splitUpdateWorker.backoff.attempts).toBe(1); // retry scheduled if synchronization fail (changeNumber is not the expected)

        // assert dequeueing changeNumber
        splitsSyncTask.__resolveSplitsUpdaterCall(2, 106);
        setTimeout(() => {
          expect(splitsSyncTask.execute).toBeCalledTimes(3); // doesn't synchronize splits again
          expect(splitUpdateWorker.maxChangeNumber).toBe(106); // maxChangeNumber

          // assert restarting retries, when a newer event is queued
          splitUpdateWorker.put({ changeNumber: 107 }); // queued
          expect(splitUpdateWorker.backoff.attempts).toBe(0); // backoff scheduler for retries is reset if a new event is queued

          done();
        });

      }, 10); // wait a little bit until `splitsSyncTask.execute` is called in next event-loop cycle
    });
  });

  test('killSplit', (done) => {
    // setup
    const cache = new SplitsCacheInMemory();
    cache.addSplit('lol1', '{ "name": "something"}');
    cache.addSplit('lol2', '{ "name": "something else"}');

    const splitsSyncTask = splitsSyncTaskMock(cache);
    const splitUpdateWorker = new SplitsUpdateWorker(cache, splitsSyncTask, splitsEventEmitterMock);

    // assert killing split locally, emitting SDK_SPLITS_ARRIVED event, and synchronizing splits if changeNumber is new
    splitUpdateWorker.killSplit({ changeNumber: 100, splitName: 'lol1', defaultTreatment: 'off' }); // splitsCache.killLocally is synchronous
    expect(splitUpdateWorker.maxChangeNumber).toBe(100); // queues changeNumber if split kill resolves with update
    expect(splitsSyncTask.execute).toBeCalledTimes(1); // synchronizes splits if `isExecuting` is false
    expect(splitsEventEmitterMock.emit.mock.calls).toEqual([[SDK_SPLITS_ARRIVED, true]]); // emits `SDK_SPLITS_ARRIVED` with `isSplitKill` flag in true, if split kill resolves with update
    assertKilledSplit(cache, 100, 'lol1', 'off');

    // assert not killing split locally, not emitting SDK_SPLITS_ARRIVED event, and not synchronizes splits, if changeNumber is old
    splitsSyncTask.__resolveSplitsUpdaterCall(0, 100);
    setTimeout(() => {
      splitsSyncTask.execute.mockClear();
      splitsEventEmitterMock.emit.mockClear();
      splitUpdateWorker.killSplit({ changeNumber: 90, splitName: 'lol1', defaultTreatment: 'on' });

      setTimeout(() => {
        expect(splitUpdateWorker.maxChangeNumber).toBe(100); // doesn't queues changeNumber if killLocally resolved without update (its changeNumber was minor than the split changeNumber
        expect(splitsSyncTask.execute).toBeCalledTimes(0); // doesn't synchronize splits if killLocally resolved without update
        expect(splitsEventEmitterMock.emit).toBeCalledTimes(0); // doesn't emit `SDK_SPLITS_ARRIVED` if killLocally resolved without update

        assertKilledSplit(cache, 100, 'lol1', 'off'); // calling `killLocally` with an old changeNumber made no effect
        done();
      });
    });
  });

});
