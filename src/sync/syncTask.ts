import { SYNC_TASK_EXECUTE, SYNC_TASK_START, SYNC_TASK_STOP } from '../logger/constants';
import { ILogger } from '../logger/types';
import { ISyncTask } from './types';

/**
 * Creates a syncTask that handles the periodic execution of a givan task ("start" and "stop" methods).
 * The task can be executed once calling the "execute" method.
 * NOTE: Multiple calls to "execute" are not queued. Use "isExecuting" method to handle synchronization.
 *
 * @param log  Logger instance.
 * @param task  Task to execute that returns a promise that NEVER REJECTS. Otherwise, periodic execution can result in Unhandled Promise Rejections.
 * @param period  Period in milliseconds to execute the task.
 * @param taskName  Optional task name for logging.
 * @returns A sync task that wraps the given task.
 */
export default function syncTaskFactory<Input extends any[], Output = any>(log: ILogger, task: (...args: Input) => Promise<Output>, period: number, taskName = 'task'): ISyncTask<Input, Output> {

  // flag that indicates if the task is being executed
  let executing = false;

  // flag that indicates if the task periodic execution has been started/stopped.
  let running = false;
  let timeoutID: number | undefined;

  // @TODO check if we need to queued `execute` calls, to avoid some corner-case race conditions on submitters and updaters with streaming.
  function execute(...args: Input) {
    executing = true;
    log.debug(SYNC_TASK_EXECUTE, [taskName]);
    return task(...args).then(result => {
      executing = false;
      return result;
    });
    // No need to handle promise rejection because it is a pre-condition that provided task never rejects.
  }

  return {
    execute,

    isExecuting() {
      return executing;
    },

    start(...args: Input) {
      if (!running) {
        running = true;
        log.debug(SYNC_TASK_START, [taskName, period]);
        timeoutID = setInterval(execute, period, ...args);
        return execute(...args);
      }
    },

    stop() {
      running = false;
      if (timeoutID) {
        log.debug(SYNC_TASK_STOP, [taskName]);
        clearInterval(timeoutID);
        timeoutID = undefined;
      }
    },

    isRunning() {
      return running;
    }
  };
}
