import { IReadinessManager } from '../readiness/types';
import { IStorageSync } from '../storages/types';
import { IPollingManager } from './polling/types';
import { IPushManager } from './streaming/types';
import { ISubmitterManager } from './submitters/types';

export interface ITask<Input extends any[] = []> {
  /**
   * Start periodic execution of the task
   */
  start(...args: Input): any,
  /**
   * Stop periodic execution of the task
   */
  stop(): any,
  /**
   * Returns true if the task periodic execution is running
   */
  isRunning(): boolean
}

export interface ISyncTask<Input extends any[] = [], Output = any> extends ITask<Input> {
  /**
   * Start periodic execution of the task, and returns the promise of the first execution
   */
  start(...args: Input): Promise<Output> | void
  /**
   * Explicitly executes the task. It can be invoked multiple times. Returns a promise when the task is resolved
   */
  execute(...args: Input): Promise<Output>
  /**
   * Returns true if the task is being executed
   */
  isExecuting(): boolean
}

/** SyncManager */

export interface ISyncManager extends ITask {
  flush(): Promise<any>,
  pushManager?: IPushManager,
  pollingManager?: IPollingManager,
  submitterManager?: ISubmitterManager
}

export interface ISyncManagerCS extends ISyncManager {
  shared(matchingKey: string, readinessManager: IReadinessManager, storage: IStorageSync): ISyncManager | undefined
}
