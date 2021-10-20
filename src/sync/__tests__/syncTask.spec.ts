import syncTaskFactory from '../syncTask';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';

const period = 30;
const taskResult = 'taskResult';
const asyncTask = jest.fn(() => Promise.resolve(taskResult));

test('syncTaskFactory', (done) => {

  const syncTask = syncTaskFactory<number[], string>(loggerMock, asyncTask, period);

  // The initial state of the syncTask is not "running" periodically neither "executing"
  expect(syncTask.isExecuting()).toBe(false);
  expect(syncTask.isRunning()).toBe(false);

  // Calling `start` periodically executes the given task and returns its result
  const startArgs = [1, 2]; // @ts-ignore
  syncTask.start(...startArgs).then(async (result) => {
    expect(syncTask.isRunning()).toBe(true); // Running periodically
    expect(syncTask.isExecuting()).toBe(false); // Already executed
    expect(result).toBe(taskResult);
    expect(asyncTask).toBeCalledWith(...startArgs);

    // Calling `start` again has not effect
    expect(syncTask.start(...startArgs)).toBe(undefined);

    // Calling `execute` inmediatelly executes the given task and returns its result
    result = await syncTask.execute(3, 4);
    expect(result).toBe(taskResult);
    expect(asyncTask).toHaveBeenLastCalledWith(3, 4);
    expect(syncTask.isExecuting()).toBe(false); // Already executed

    // Calling `execute` again result in a new execution of the given task
    result = await syncTask.execute(5, 6);
    expect(result).toBe(taskResult);
    expect(asyncTask).toHaveBeenLastCalledWith(5, 6);
    expect(syncTask.isExecuting()).toBe(false); // Already executed

  });

  expect(syncTask.isExecuting()).toBe(true); // Executing

  setTimeout(() => {
    expect(asyncTask).toHaveBeenLastCalledWith(...startArgs); // Periodic call should be done with the initial `start` arguments
    expect(asyncTask).toBeCalledTimes(4); // The task was executed 4 times: twice due to periodic execution and twice due to execute call

    setTimeout(() => {
      expect(asyncTask).toHaveBeenLastCalledWith(...startArgs); // Periodic call should be done with the initial `start` arguments
      expect(asyncTask).toBeCalledTimes(5); // The task was executed 5 times: 3 due to periodic execution and twice due to execute call

      // Calling `stop` stops the periodic execution of the given task
      expect(syncTask.isRunning()).toBe(true); // Running periodically
      syncTask.stop();
      expect(syncTask.isRunning()).toBe(false); // Stop running periodically

      setTimeout(() => {
        expect(asyncTask).toBeCalledTimes(5); // Stopped task should not be called again

        // Stopping and starting
        syncTask.stop();
        syncTask.start(); // Inmediatelly call task
        syncTask.stop();
        syncTask.start(); // Inmediatelly call task
        syncTask.stop();
        expect(asyncTask).toBeCalledTimes(7);

        // // Resume periodic execution
        syncTask.start(); // Inmediatelly call task
        syncTask.start(); // No effect
        expect(asyncTask).toBeCalledTimes(8);

        setTimeout(() => {
          expect(asyncTask).toBeCalledTimes(9); // Stopped task should not be called again
          expect(syncTask.isRunning()).toBe(true); // Running periodically
          syncTask.stop(); // Finally stop to finish the test
          expect(syncTask.isRunning()).toBe(false); // Stop running periodically

          done();
        }, period + 10);
      }, period + 10);
    }, period + 10);
  }, period + 10);

});
