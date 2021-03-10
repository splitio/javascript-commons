import { DEBUG_48, DEBUG_47, DEBUG_49 } from '../logger/codesConstants';
import { ILogger } from '../logger/types';
import { ISyncTask } from './types';
// import { logFactory } from '../logger/sdkLogger';
// const log = logFactory('splitio-sync:task');

/**
 * factory of sync tasks
 */
export default function syncTaskFactory<Input extends any[], Output>(log: ILogger, task: (...args: Input) => Promise<Output>, period: number, taskName = 'task'): ISyncTask<Input, Output> {

  // flag that indicates if the task is being executed
  let executing = false;

  // flag that indicates if the task periodic execution has been started/stopped. We cannot use timeoutID because it is set after the first execution of the task.
  let running = false;
  let timeoutID: number | undefined;

  function execute(...args: Input) {
    executing = true;
    log.debug(DEBUG_48, [taskName]);
    return task(...args).then(result => {
      executing = false;
      if (running) timeoutID = setTimeout(execute, period, ...args);
      return result;
    });
  }

  return {
    execute,

    isExecuting() {
      return executing;
    },

    start(...args: Input) {
      if (!running) {
        running = true;
        log.debug(DEBUG_47, [taskName, period]);
        return execute(...args);
      }
    },

    stop() {
      running = false;
      if (timeoutID) {
        log.debug(DEBUG_49, [taskName]);
        clearTimeout(timeoutID);
        timeoutID = undefined;
      }
    },

    isRunning() {
      return running;
    }
  };
}
