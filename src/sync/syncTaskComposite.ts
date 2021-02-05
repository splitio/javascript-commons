import { ISyncTask } from './types';

/**
 * Composite Sync Task: group of sync tasks that are treated as a single one.
 */
export function syncTaskComposite(syncTasks: ISyncTask[]): ISyncTask {

  return {
    start() {
      syncTasks.forEach(syncTask => syncTask.start());
    },
    stop() {
      syncTasks.forEach(syncTask => syncTask.stop());
    },
    isRunning() {
      return syncTasks.some(syncTask => syncTask.isRunning());
    },
    execute() {
      return Promise.all(syncTasks.map(syncTask => syncTask.execute()));
    },
    isExecuting() {
      return syncTasks.some(syncTask => syncTask.isExecuting());
    }
  };

}
