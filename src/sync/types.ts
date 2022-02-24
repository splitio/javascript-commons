import { IReadinessManager } from '../readiness/types';
import { IPlatform } from '../sdkFactory/types';
import { ISplitApi } from '../services/types';
import { IStorageSync } from '../storages/types';
import { ISettings } from '../types';
import { IPollingManager } from './polling/types';
import { IPushManager } from './streaming/types';

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

export interface ITimeTracker {
  start(): () => void // start tracking time and return a function to call for stopping the tracking
}

/** SyncManager */

export interface ISyncManager extends ITask {
  flush(): Promise<any>,
  pushManager?: IPushManager,
  pollingManager?: IPollingManager,
  submitter?: ISyncTask
}

export interface ISyncManagerCS extends ISyncManager {
  shared(matchingKey: string, readinessManager: IReadinessManager, storage: IStorageSync): ISyncManager | undefined
}

export interface ISyncManagerFactoryParams {
  settings: ISettings,
  readiness: IReadinessManager,
  storage: IStorageSync,
  splitApi: ISplitApi,
  platform: IPlatform
}
