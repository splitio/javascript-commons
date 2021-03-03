import { ILogger } from '../logger/types';
import { ISyncTask } from './types';
// import { logFactory } from '../logger/sdkLogger';
// const log = logFactory('splitio-sync:task');

/**
 * factory of sync tasks
 */
export default function syncTaskFactory<Input extends any[], Output>(task: (...args: Input) => Promise<Output>, period: number, taskName = 'task', log: ILogger): ISyncTask<Input, Output> {

  // flag that indicates if the task is being executed
  let executing = false;

  // flag that indicates if the task periodic execution has been started/stopped. We cannot use timeoutID because it is set after the first execution of the task.
  let running = false;
  let timeoutID: number | undefined;

  function execute(...args: Input) {
    executing = true;
    log.debug(`Running ${taskName}`);
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
        log.debug(`Starting ${taskName}. Running each ${period} millis`);
        return execute(...args);
      }
    },

    stop() {
      running = false;
      if (timeoutID) {
        log.debug(`Stopping ${taskName}`);
        clearTimeout(timeoutID);
        timeoutID = undefined;
      }
    },

    isRunning() {
      return running;
    }
  };
}
