import { ISyncManager, ISyncManagerCS, ISyncManagerFactoryParams } from './types';
import fromObjectSyncTaskFactory from './offline/syncTasks/fromObjectSyncTask';
import objectAssign from 'object-assign';
import { ISplitsParser } from './offline/splitsParser/types';
import { IReadinessManager } from '../readiness/types';

function flush() {
  return Promise.resolve();
}

/**
 * Offline SyncManager factory.
 * Can be used for server-side API, and client-side API with or without multiple clients.
 *
 * @param splitsParser e.g., `splitsParserFromFile`, `splitsParserFromSettings`.
 */
export function syncManagerOfflineFactory(
  splitsParser: ISplitsParser
): (params: ISyncManagerFactoryParams) => ISyncManagerCS {

  /**
   * SyncManager factory for modular SDK
   */
  return function ({
    settings,
    readiness,
    storage,
  }: ISyncManagerFactoryParams): ISyncManagerCS {

    return objectAssign(
      fromObjectSyncTaskFactory(splitsParser, storage, readiness, settings),
      {
        // fake flush, that resolves immediately
        flush,

        // [Only used for client-side]
        shared(matchingKey: string, readinessManager: IReadinessManager): ISyncManager {
          return {
            start() {
              // In LOCALHOST mode, shared clients are ready in the next event cycle than created
              // SDK_READY cannot be emitted directly because this will not update the readiness status
              setTimeout(() => {
                readinessManager.segments.emit('SDK_SEGMENTS_ARRIVED'); // SDK_SPLITS_ARRIVED emitted by main SyncManager
              }, 0);
            },
            stop() { },
            isRunning() {
              return true;
            },
            flush,
          };
        }
      }
    );
  };
}
