import { SYNC_TASK_EXECUTE, SYNC_TASK_START, SYNC_TASK_STOP } from '../logger/constants';
import { ILogger } from '../logger/types';
import { ISyncTask } from './types';

/**
 * Creates a syncTask that handles the periodic execution of a given task ("start" and "stop" methods).
 * The task can be executed once calling the "execute" method.
 * NOTE: Multiple calls to "execute" are not queued. Use "isExecuting" method to handle synchronization.
 *
 * @param log  Logger instance.
 * @param task  Task to execute that returns a promise that NEVER REJECTS. Otherwise, periodic execution can result in Unhandled Promise Rejections.
 * @param period  Period in milliseconds to execute the task.
 * @param taskName  Optional task name for logging.
 * @returns A sync task that wraps the given task.
 */
export function syncTaskFactory<Input extends any[], Output = any>(log: ILogger, task: (...args: Input) => Promise<Output>, period: number, taskName = 'task'): ISyncTask<Input, Output> {

  // Flag that indicates if the task is being executed
  let executing = false;
  // flag that indicates if the task periodic execution has been started/stopped.
  let running = false;
  // Auxiliar counter used to avoid race condition when calling `start` & `stop` intermittently
  let runningId = 0;
  // Params passed to `task` when called periodically
  let runningArgs: Input;
  // Id of the periodic call timeout
  let timeoutID: any;

  function execute(...args: Input) {
    executing = true;
    log.debug(SYNC_TASK_EXECUTE, [taskName]);
    return task(...args).then(result => {
      executing = false;
      return result;
    });
    // No need to handle promise rejection because it is a pre-condition that provided task never rejects.
  }

  function periodicExecute(currentRunningId: number) {
    return execute(...runningArgs).then((result) => {
      // Call `setTimeout` if periodic execution was started and `currentRunningId === runningId`
      // to avoid a race condition when calling `start`, `stop` and `start` again
      if (running && currentRunningId === runningId) timeoutID = setTimeout(periodicExecute, period, currentRunningId);
      return result;
    });
  }

  return {
    // @TODO check if we need to queued `execute` calls, to avoid possible race conditions on submitters and updaters with streaming.
    execute,

    isExecuting() {
      return executing;
    },

    start(...args: Input) {
      if (!running) {
        running = true;
        runningId++;
        runningArgs = args;
        log.debug(SYNC_TASK_START, [taskName, period]);
        return periodicExecute(runningId);
      }
    },

    stop() {
      running = false;
      if (timeoutID) {
        log.debug(SYNC_TASK_STOP, [taskName]);
        clearTimeout(timeoutID);
        timeoutID = undefined;
      }
    },

    isRunning() {
      return running;
    }
  };
}
