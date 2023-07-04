// @ts-nocheck
import { SDK_SPLITS_ARRIVED } from '../../../../readiness/constants';
import { SplitsCacheInMemory } from '../../../../storages/inMemory/SplitsCacheInMemory';
import { SplitsUpdateWorker } from '../SplitsUpdateWorker';
import { FETCH_BACKOFF_MAX_RETRIES } from '../constants';
import { loggerMock } from '../../../../logger/__tests__/sdkLogger.mock';
import { syncTaskFactory } from '../../../syncTask';
import { Backoff } from '../../../../utils/Backoff';
import { splitNotifications } from '../../../streaming/__tests__/dataMocks';
import { telemetryTrackerFactory } from '../../../../trackers/telemetryTracker';

function splitsSyncTaskMock(splitStorage: SplitsCacheInMemory, changeNumbers = []) {

  const __splitsUpdaterCalls = [];

  function __resolveSplitsUpdaterCall(changeNumber: number) {
    splitStorage.setChangeNumber(changeNumber); // update changeNumber in storage
    if (__splitsUpdaterCalls.length) __splitsUpdaterCalls.shift().res(); // resolve `execute` call
    else changeNumbers.push(changeNumber);
  }

  const syncTask = syncTaskFactory(
    { debug() { } }, // no-op logger
    () => {
      return new Promise((res) => {
        __splitsUpdaterCalls.push({ res });
        if (changeNumbers && changeNumbers.length) __resolveSplitsUpdaterCall(changeNumbers.shift());
      });
    }
  );

  return {
    isExecuting: jest.fn(syncTask.isExecuting),
    execute: jest.fn(syncTask.execute),

    __resolveSplitsUpdaterCall
  };
}

const splitsEventEmitterMock = {
  emit: jest.fn(),
};

function assertKilledSplit(cache, changeNumber, splitName, defaultTreatment) {
  const split = cache.getSplit(splitName);
  expect(split.killed).toBe(true); // split must be killed
  expect(split.defaultTreatment).toBe(defaultTreatment); // split must have the given default treatment
  expect(split.changeNumber).toBe(changeNumber); // split must have the given change number
}

describe('SplitsUpdateWorker', () => {

  afterEach(() => { // restore
    Backoff.__TEST__BASE_MILLIS = undefined;
    Backoff.__TEST__MAX_MILLIS = undefined;
  });

  test('put', async () => {

    // setup
    const cache = new SplitsCacheInMemory();
    const splitsSyncTask = splitsSyncTaskMock(cache);
    const telemetryTracker = telemetryTrackerFactory(); // no-op telemetry tracker

    Backoff.__TEST__BASE_MILLIS = 1; // retry immediately
    const splitUpdateWorker = SplitsUpdateWorker(loggerMock, cache, splitsSyncTask, telemetryTracker);

    // assert calling `splitsSyncTask.execute` if `isExecuting` is false
    expect(splitsSyncTask.isExecuting()).toBe(false);
    splitUpdateWorker.put({ changeNumber: 100 }); // queued
    expect(splitsSyncTask.execute).toBeCalledTimes(1); // synchronizes splits if `isExecuting` is false

    // assert queueing changeNumber if `isExecuting` is true
    expect(splitsSyncTask.isExecuting()).toBe(true);
    splitUpdateWorker.put({ changeNumber: 105 }); // queued
    splitUpdateWorker.put({ changeNumber: 104 }); // not queued
    splitUpdateWorker.put({ changeNumber: 106 }); // queued
    splitUpdateWorker.put({ changeNumber: 103 }); // not queued
    expect(splitsSyncTask.execute).toBeCalledTimes(1); // doesn't synchronize splits while `isExecuting` is true

    // assert calling `splitsSyncTask.execute` if previous call is resolved and a new changeNumber in queue
    splitsSyncTask.__resolveSplitsUpdaterCall(100);

    await new Promise(res => setTimeout(res, 20));
    expect(splitsSyncTask.execute).toBeCalledTimes(2); // re-synchronizes splits if `isExecuting` is false and queue is not empty

    // assert reschedule synchronization if changeNumber is not updated as expected
    splitsSyncTask.__resolveSplitsUpdaterCall(100);
    await new Promise(res => setTimeout(res, 20));
    expect(splitsSyncTask.execute).toBeCalledTimes(3); // re-synchronizes splits if synchronization fail (changeNumber is not the expected)

    // assert dequeueing changeNumber
    splitsSyncTask.__resolveSplitsUpdaterCall(106); // resolve with target changeNumber
    await new Promise(res => setTimeout(res, 20)); // Wait to assert no more calls with backoff
    expect(splitsSyncTask.execute).toBeCalledTimes(3); // doesn't synchronize splits again

    expect(loggerMock.debug).lastCalledWith('Refresh completed in 2 attempts.');
  });

  test('put, backoff', async () => {
    // setup
    Backoff.__TEST__BASE_MILLIS = 50;
    const cache = new SplitsCacheInMemory();
    const splitsSyncTask = splitsSyncTaskMock(cache, [90, 90, 90]);
    const telemetryTracker = telemetryTrackerFactory(); // no-op telemetry tracker
    const splitUpdateWorker = SplitsUpdateWorker(loggerMock, cache, splitsSyncTask, telemetryTracker);

    // while fetch fails, should retry with backoff
    splitUpdateWorker.put({ changeNumber: 100 });
    await new Promise(res => setTimeout(res, Backoff.__TEST__BASE_MILLIS * 3 + 100 /* some delay */));
    expect(splitsSyncTask.execute).toBeCalledTimes(3);

    // if backoff is scheduled and a new event is queued, it must be handled immediately
    splitUpdateWorker.put({ changeNumber: 105 });
    expect(splitsSyncTask.execute).toBeCalledTimes(4);
  });

  test('put, completed with CDN bypass', async () => {

    // setup
    Backoff.__TEST__BASE_MILLIS = 10; // 10 millis instead of 10 sec
    Backoff.__TEST__MAX_MILLIS = 60; // 60 millis instead of 1 min
    const cache = new SplitsCacheInMemory();
    const splitsSyncTask = splitsSyncTaskMock(cache, [...Array(FETCH_BACKOFF_MAX_RETRIES).fill(90), 90, 100]); // 12 executions. Last one is valid
    const telemetryTracker = telemetryTrackerFactory(); // no-op telemetry tracker
    const splitUpdateWorker = SplitsUpdateWorker(loggerMock, cache, splitsSyncTask, telemetryTracker);

    splitUpdateWorker.put({ changeNumber: 100 }); // queued

    await new Promise(res => setTimeout(res, 540)); // 440 + some delay

    expect(loggerMock.debug).lastCalledWith('Refresh completed bypassing the CDN in 2 attempts.');
    expect(splitsSyncTask.execute.mock.calls).toEqual([
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill([true, undefined, undefined]),
      [true, 100, undefined], [true, 100, undefined],
    ]); // `execute` was called 12 times. Last 2 with CDN bypass

    // Handle new event after previous is completed
    splitsSyncTask.execute.mockClear();
    splitUpdateWorker.put({ changeNumber: 105 });
    expect(splitsSyncTask.execute).toBeCalledTimes(1);
  });

  test('put, not completed with CDN bypass', async () => {

    // setup
    Backoff.__TEST__BASE_MILLIS = 10; // 10 millis instead of 10 sec
    Backoff.__TEST__MAX_MILLIS = 60; // 60 millis instead of 1 min
    const cache = new SplitsCacheInMemory();
    const splitsSyncTask = splitsSyncTaskMock(cache, Array(FETCH_BACKOFF_MAX_RETRIES * 2).fill(90)); // 20 executions. No one is valid
    const telemetryTracker = telemetryTrackerFactory(); // no-op telemetry tracker
    const splitUpdateWorker = SplitsUpdateWorker(loggerMock, cache, splitsSyncTask, telemetryTracker);

    splitUpdateWorker.put({ changeNumber: 100 }); // queued

    await new Promise(res => setTimeout(res, 960)); // 860 + some delay

    expect(loggerMock.debug).lastCalledWith('No changes fetched after 10 attempts with CDN bypassed.');
    expect(splitsSyncTask.execute.mock.calls).toEqual([
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill([true, undefined, undefined]),
      ...Array(FETCH_BACKOFF_MAX_RETRIES).fill([true, 100, undefined]),
    ]); // `execute` was called 20 times. Last 10 with CDN bypass

    // Handle new event after previous ends (not completed)
    splitsSyncTask.execute.mockClear();
    splitUpdateWorker.put({ changeNumber: 105 });
    expect(splitsSyncTask.execute).toBeCalledTimes(1);
  });

  test('killSplit', async () => {
    // setup
    const cache = new SplitsCacheInMemory();
    cache.addSplit('lol1', '{ "name": "something"}');
    cache.addSplit('lol2', '{ "name": "something else"}');

    const splitsSyncTask = splitsSyncTaskMock(cache);
    const telemetryTracker = telemetryTrackerFactory(); // no-op telemetry tracker
    const splitUpdateWorker = SplitsUpdateWorker(loggerMock, cache, splitsSyncTask, splitsEventEmitterMock, telemetryTracker);

    // assert killing split locally, emitting SDK_SPLITS_ARRIVED event, and synchronizing splits if changeNumber is new
    splitUpdateWorker.killSplit({ changeNumber: 100, splitName: 'lol1', defaultTreatment: 'off' }); // splitsCache.killLocally is synchronous
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
    expect(splitsSyncTask.execute).toBeCalledTimes(0); // doesn't synchronize splits if killLocally resolved without update
    expect(splitsEventEmitterMock.emit).toBeCalledTimes(0); // doesn't emit `SDK_SPLITS_ARRIVED` if killLocally resolved without update

    assertKilledSplit(cache, 100, 'lol1', 'off'); // calling `killLocally` with an old changeNumber made no effect
  });

  test('stop', async () => {
    // setup
    const cache = new SplitsCacheInMemory();
    const splitsSyncTask = splitsSyncTaskMock(cache, [95]);
    const telemetryTracker = telemetryTrackerFactory(); // no-op telemetry tracker
    Backoff.__TEST__BASE_MILLIS = 1;
    const splitUpdateWorker = SplitsUpdateWorker(loggerMock, cache, splitsSyncTask, telemetryTracker);

    splitUpdateWorker.put({ changeNumber: 100 });

    splitUpdateWorker.stop();

    await new Promise(res => setTimeout(res, 20)); // Wait to assert no more calls to `execute` after reseting
    expect(splitsSyncTask.execute).toBeCalledTimes(1);
  });

  test('put, avoid fetching if payload sent', async () => {

    const cache = new SplitsCacheInMemory();
    splitNotifications.forEach(notification => {
      const pcn = cache.getChangeNumber();
      const splitsSyncTask = splitsSyncTaskMock(cache);
      const telemetryTracker = telemetryTrackerFactory(); // no-op telemetry tracker
      const splitUpdateWorker = SplitsUpdateWorker(loggerMock, cache, splitsSyncTask, telemetryTracker);
      const payload = notification.decoded;
      const changeNumber = payload.changeNumber;
      splitUpdateWorker.put( { changeNumber, pcn }, payload); // queued
      expect(splitsSyncTask.execute).toBeCalledTimes(1);
      expect(splitsSyncTask.execute.mock.calls[0]).toEqual([true, undefined, {changeNumber, payload}]);
    });
  });

  test('put, ccn and pcn validation for IFF', () => {
    const cache = new SplitsCacheInMemory();

    // ccn = 103 & pcn = 104: Something was missed -> fetch split changes
    let ccn = 103;
    let pcn = 104;
    let changeNumber = 105;
    cache.setChangeNumber(ccn);
    const notification = splitNotifications[0];

    let splitsSyncTask = splitsSyncTaskMock(cache);
    const telemetryTracker = telemetryTrackerFactory(); // no-op telemetry tracker
    let splitUpdateWorker = SplitsUpdateWorker(loggerMock, cache, splitsSyncTask, telemetryTracker);
    splitUpdateWorker.put({ changeNumber, pcn }, notification.decoded);
    expect(splitsSyncTask.execute).toBeCalledTimes(1);
    expect(splitsSyncTask.execute.mock.calls[0]).toEqual([true, undefined, undefined]);
    splitsSyncTask.execute.mockClear();

    // ccn = 110 & pcn = 0: Something was missed -> something wrong in `pushNotificationManager` -> fetch split changes
    ccn = 110;
    pcn = 0;
    changeNumber = 111;
    cache.setChangeNumber(ccn);

    splitsSyncTask = splitsSyncTaskMock(cache);
    splitUpdateWorker = SplitsUpdateWorker(loggerMock, cache, splitsSyncTask, telemetryTracker);
    splitUpdateWorker.put({ changeNumber, pcn }, notification.decoded);
    expect(splitsSyncTask.execute).toBeCalledTimes(1);
    expect(splitsSyncTask.execute.mock.calls[0]).toEqual([true, undefined, undefined]);
    splitsSyncTask.execute.mockClear();

    // ccn = 120 & pcn = 120: In order consecutive notifications arrived, apply updates normaly
    ccn = 120;
    pcn = 120;
    changeNumber = 121;
    cache.setChangeNumber(ccn);

    splitsSyncTask = splitsSyncTaskMock(cache);
    splitUpdateWorker = SplitsUpdateWorker(loggerMock, cache, splitsSyncTask, telemetryTracker);
    splitUpdateWorker.put({ changeNumber, pcn }, notification.decoded);
    expect(splitsSyncTask.execute).toBeCalledTimes(1);
    expect(splitsSyncTask.execute.mock.calls[0]).toEqual([true, undefined, {payload: notification.decoded, changeNumber }]);

  });
});
