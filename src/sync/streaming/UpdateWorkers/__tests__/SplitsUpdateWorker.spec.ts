// @ts-nocheck
import { SDK_SPLITS_ARRIVED } from '../../../../readiness/constants';
import { SplitsCacheInMemory } from '../../../../storages/inMemory/SplitsCacheInMemory';
import { SplitsUpdateWorker } from '../SplitsUpdateWorker';
import { FETCH_BACKOFF_MAX_RETRIES } from '../constants';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';

function splitsSyncTaskMock(splitStorage, changeNumbers: number[]) {

  const __splitsUpdaterCalls = [];

  function __resolveSplitsUpdaterCall(changeNumber: number) {
    splitStorage.setChangeNumber(changeNumber); // update changeNumber in storage
    __splitsUpdaterCalls.shift().res(); // resolve `execute` call
  }

  let __isSynchronizingSplits = false;

  function isExecuting() {
    return __isSynchronizingSplits;
  }

  function execute() {
    __isSynchronizingSplits = true;
    return new Promise((res) => {
      __splitsUpdaterCalls.push({ res });
      if (changeNumbers && changeNumbers.length) __resolveSplitsUpdaterCall(changeNumbers.shift());
    }).then(function () {
      __isSynchronizingSplits = false;
    });
  }

  return {
    isExecuting: jest.fn(isExecuting),
    execute: jest.fn(execute),

    __resolveSplitsUpdaterCall
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

  test('put', async () => {

    // setup
    const cache = new SplitsCacheInMemory();
    const splitsSyncTask = splitsSyncTaskMock(cache);

    const splitUpdateWorker = new SplitsUpdateWorker(loggerMock, cache, splitsSyncTask);
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
    splitsSyncTask.__resolveSplitsUpdaterCall(100);

    await new Promise(res => setTimeout(res));
    expect(splitsSyncTask.execute).toBeCalledTimes(2); // re-synchronizes splits if `isExecuting` is false and queue is not empty
    expect(splitUpdateWorker.maxChangeNumber).toBe(106); // maxChangeNumber
    expect(splitUpdateWorker.backoff.attempts).toBe(0); // no retry scheduled if synchronization success (changeNumber is the expected)

    // assert reschedule synchronization if changeNumber is not updated as expected
    splitsSyncTask.__resolveSplitsUpdaterCall(100);
    await new Promise(res => setTimeout(res, 10)); // wait a little bit until `splitsSyncTask.execute` is called in next event-loop cycle
    expect(splitsSyncTask.execute).toBeCalledTimes(3); // re-synchronizes splits if synchronization fail (changeNumber is not the expected)
    expect(splitUpdateWorker.maxChangeNumber).toBe(106); // maxChangeNumber
    expect(splitUpdateWorker.backoff.attempts).toBe(1); // retry scheduled if synchronization fail (changeNumber is not the expected)

    // assert dequeueing changeNumber
    splitsSyncTask.__resolveSplitsUpdaterCall(106);
    await new Promise(res => setTimeout(res));
    expect(splitsSyncTask.execute).toBeCalledTimes(3); // doesn't synchronize splits again
    expect(splitUpdateWorker.maxChangeNumber).toBe(106); // maxChangeNumber

    // assert restarting retries, when a newer event is queued
    splitUpdateWorker.put({ changeNumber: 107 }); // queued
    expect(splitUpdateWorker.backoff.attempts).toBe(0); // backoff scheduler for retries is reset if a new event is queued

    expect(loggerMock.debug).lastCalledWith('Refresh completed in 2 attempts.');
  });

  test('put, completed with CDN bypass', async () => {

    // setup
    const cache = new SplitsCacheInMemory();
    const splitsSyncTask = splitsSyncTaskMock(cache, [...Array(FETCH_BACKOFF_MAX_RETRIES).fill(90), 90, 100]); // 12 executions. Last one is valid
    const splitUpdateWorker = new SplitsUpdateWorker(loggerMock, cache, splitsSyncTask);
    splitUpdateWorker.backoff.baseMillis /= 1000; // 10 millis instead of 10 sec
    splitUpdateWorker.backoff.maxMillis /= 1000; // 60 millis instead of 1 min

    splitUpdateWorker.put({ changeNumber: 100 }); // queued

    await new Promise(res => setTimeout(res, 540)); // 440 + some delay

    expect(loggerMock.debug).lastCalledWith('Refresh completed bypassing the CDN in 2 attempts.');
    expect(splitsSyncTask.execute.mock.calls).toEqual([
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill([true, undefined]),
      [true, 100], [true, 100],
    ]); // `execute` was called 12 times. Last 2 with CDN bypass
  });


  test('put, not completed with CDN bypass', async () => {

    // setup
    const cache = new SplitsCacheInMemory();
    const splitsSyncTask = splitsSyncTaskMock(cache, Array(FETCH_BACKOFF_MAX_RETRIES * 2).fill(90)); // 20 executions. No one is valid
    const splitUpdateWorker = new SplitsUpdateWorker(loggerMock, cache, splitsSyncTask);
    splitUpdateWorker.backoff.baseMillis /= 1000; // 10 millis instead of 10 sec
    splitUpdateWorker.backoff.maxMillis /= 1000; // 60 millis instead of 1 min

    splitUpdateWorker.put({ changeNumber: 100 }); // queued

    await new Promise(res => setTimeout(res, 960)); // 860 + some delay

    expect(loggerMock.debug).lastCalledWith('No changes fetched after 10 attempts with CDN bypassed.');
    expect(splitsSyncTask.execute.mock.calls).toEqual([
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill([true, undefined]),
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill([true, 100]),
    ]); // `execute` was called 20 times. Last 10 with CDN bypass
  });

  test('killSplit', async () => {
    // setup
    const cache = new SplitsCacheInMemory();
    cache.addSplit('lol1', '{ "name": "something"}');
    cache.addSplit('lol2', '{ "name": "something else"}');

    const splitsSyncTask = splitsSyncTaskMock(cache);
    const splitUpdateWorker = new SplitsUpdateWorker(loggerMock, cache, splitsSyncTask, splitsEventEmitterMock);

    // assert killing split locally, emitting SDK_SPLITS_ARRIVED event, and synchronizing splits if changeNumber is new
    splitUpdateWorker.killSplit({ changeNumber: 100, splitName: 'lol1', defaultTreatment: 'off' }); // splitsCache.killLocally is synchronous
    expect(splitUpdateWorker.maxChangeNumber).toBe(100); // queues changeNumber if split kill resolves with update
    expect(splitsSyncTask.execute).toBeCalledTimes(1); // synchronizes splits if `isExecuting` is false
    expect(splitsEventEmitterMock.emit.mock.calls).toEqual([[SDK_SPLITS_ARRIVED, true]]); // emits `SDK_SPLITS_ARRIVED` with `isSplitKill` flag in true, if split kill resolves with update
    assertKilledSplit(cache, 100, 'lol1', 'off');

    // assert not killing split locally, not emitting SDK_SPLITS_ARRIVED event, and not synchronizes splits, if changeNumber is old
    splitsSyncTask.__resolveSplitsUpdaterCall(100);
    await new Promise(res => setTimeout(res));
    splitsSyncTask.execute.mockClear();
    splitsEventEmitterMock.emit.mockClear();
    splitUpdateWorker.killSplit({ changeNumber: 90, splitName: 'lol1', defaultTreatment: 'on' });

    await new Promise(res => setTimeout(res));
    expect(splitUpdateWorker.maxChangeNumber).toBe(100); // doesn't queues changeNumber if killLocally resolved without update (its changeNumber was minor than the split changeNumber
    expect(splitsSyncTask.execute).toBeCalledTimes(0); // doesn't synchronize splits if killLocally resolved without update
    expect(splitsEventEmitterMock.emit).toBeCalledTimes(0); // doesn't emit `SDK_SPLITS_ARRIVED` if killLocally resolved without update

    assertKilledSplit(cache, 100, 'lol1', 'off'); // calling `killLocally` with an old changeNumber made no effect
  });

});
