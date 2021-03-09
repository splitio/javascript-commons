import timer from '../timer';
import tracker from '../index';
import { loggerMock } from '../../../logger/__tests__/sdkLogger.mock';

test('TIMER / should count the time between two tasks', (done) => {
  const timerDuration = Math.floor(Math.random() * 1000); // In millis
  const stopTimer = timer();

  setTimeout(() => {
    const elapsedTime = stopTimer();

    expect(elapsedTime >= timerDuration - 20).toBe(true); // Timer should return correct difference (calculations made with +-20ms)
    expect(elapsedTime <= timerDuration + 20).toBe(true); // Timer should return correct difference (calculations made with +-20ms)
    done();
  }, timerDuration);
});

describe('TIME TRACKER', () => {

  test('should have the correct API', () => {
    expect(typeof tracker.start).toBe('function'); // It should have the correct API.
    expect(typeof tracker.stop).toBe('function'); // It should have the correct API.
    expect(typeof tracker.TaskNames).toBe('object'); // It should have the correct API.
  });

  test('start() / should return the correct type', () => {
    const promise = new Promise<Response>(res => {
      setTimeout(res, 1000);
    });
    const startNormal = tracker.start(tracker.TaskNames.SDK_READY, loggerMock);
    const startNormalFake = tracker.start('fakeTask3', loggerMock);
    const startWithPromise = tracker.start('fakeTask4', loggerMock, undefined, promise) as Promise<any>;

    expect(typeof startNormal).toBe('function'); // If we call start without a promise, it will return the stop function,
    // @ts-expect-error
    expect(typeof startNormal.setCollectorForTask).toBe('function'); // that has a function as well for setting the collector at a defered time, because it has a registered cb but no collector received.
    // @ts-expect-error
    expect(typeof startNormalFake.setCollectorForTask).toBe('undefined'); // If no callback is registered for the task, no collectors setup function is attached to returned one.
    expect(typeof startWithPromise.then).toBe('function'); // But if we pass a promise, we will get a promise back, with the necessary callbacks already handled.
  });

  test('stop() / should stop the timer and return the time, if any', () => {
    tracker.start('test_task', loggerMock);

    // creating two tasks with the same task name
    const stopFromStart = tracker.start('fakeTask5', loggerMock) as () => number;
    const stopFromStart2 = tracker.start('fakeTask5', loggerMock) as () => number;

    const stopNotExistentTask = tracker.stop('not_existent', loggerMock);
    const stopNotExistentTaskAndModifier = tracker.stop('test_task', loggerMock, 'mod');

    expect(typeof stopNotExistentTask).toBe('undefined'); // If we try to stop a timer that does not exist, we get undefined.
    expect(typeof stopNotExistentTaskAndModifier).toBe('undefined'); // If we try to stop a timer that does not exist, we get undefined.
    expect(typeof stopFromStart()).toBe('number'); // But if we stop an existing task from the startUnique() returned function, we get a number.
    expect(typeof stopFromStart()).toBe('undefined'); // if we stop the same task again, we get undefined.

    expect(typeof stopFromStart2()).toBe('number'); // But if we stop another task created with the same task name, we get a number.
  });

});
