import syncTaskFactory from '../syncTask';
import { loggerMock } from '../../logger/__tests__/sdkLogger.mock';

const period = 50;
const taskResult = 'taskResult';
const asyncTask = jest.fn(() => Promise.resolve(taskResult));

test('syncTaskFactory', (done) => {

  const syncTask = syncTaskFactory<number[], string>(loggerMock, asyncTask, period);

  // The initial state of the syncTask is not "running" periodically neither "executing"
  expect(syncTask.isExecuting()).toBe(false);
  expect(syncTask.isRunning()).toBe(false);

  // Calling `start` periodically executes the given task and returns its result
  const args = [1, 2]; // @ts-ignore
  syncTask.start(...args).then((result) => {
    expect(syncTask.isRunning()).toBe(true); // Running periodically
    expect(syncTask.isExecuting()).toBe(false); // Already executed
    expect(result).toBe(taskResult);
    expect(asyncTask).toBeCalledWith(...args);

    // Calling `start` again has not effect
    expect(syncTask.start(...args)).toBe(undefined);

    // Calling `execute` inmediatelly executes the given task and returns its result
    syncTask.execute(5, 6).then((result) => {
      expect(result).toBe(taskResult);
      expect(asyncTask).toHaveBeenLastCalledWith(5, 6);
      expect(syncTask.isExecuting()).toBe(false); // Already executed
    });
    expect(syncTask.isExecuting()).toBe(true); // Executing
  });

  setTimeout(() => {
    expect(asyncTask).toHaveBeenLastCalledWith(...args); // Periodic call should be done with the initial `start` arguments
    expect(asyncTask).toBeCalledTimes(3); // The task was executed 3 times: twice due to periodic execution and once due to execute call

    // Calling `stop` stops the periodic execution of the given task
    expect(syncTask.isRunning()).toBe(true); // Running periodically
    syncTask.stop();
    expect(syncTask.isRunning()).toBe(false); // Stop running periodically

    setTimeout(() => {
      expect(asyncTask).toBeCalledTimes(3); // Stopped task should not be called again
      syncTask.stop();
      done();
    }, period + 10);
  }, period + 10);

});
