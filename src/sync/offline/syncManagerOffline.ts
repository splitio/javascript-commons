import { ISyncManagerCS } from '../types';
import { fromObjectSyncTaskFactory } from './syncTasks/fromObjectSyncTask';
import { objectAssign } from '../../utils/lang/objectAssign';
import { ISplitsParser } from './splitsParser/types';
import { IReadinessManager } from '../../readiness/types';
import { SDK_SEGMENTS_ARRIVED } from '../../readiness/constants';
import { ISdkFactoryContextSync } from '../../sdkFactory/types';

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
  splitsParserFactory: () => ISplitsParser
): (params: ISdkFactoryContextSync) => ISyncManagerCS {

  /**
   * SyncManager factory for modular SDK
   */
  return function ({
    settings,
    readiness,
    storage,
  }: ISdkFactoryContextSync): ISyncManagerCS {

    const mainSyncManager = fromObjectSyncTaskFactory(splitsParserFactory(), storage, readiness, settings);
    const mainStart = mainSyncManager.start;
    const sharedStarts: Array<() => void> = [];

    return objectAssign(
      mainSyncManager,
      {
        start() {
          mainStart();
          sharedStarts.forEach(cb => cb());
          sharedStarts.length = 0;
        },
        // fake flush, that resolves immediately
        flush,

        // [Only used for client-side]
        shared(matchingKey: string, readinessManager: IReadinessManager) {
          // In LOCALHOST mode, shared clients are ready in the next event-loop cycle than created
          // SDK_READY cannot be emitted directly because this will not update the readiness status
          function emitSdkReady() {
            readinessManager.segments.emit(SDK_SEGMENTS_ARRIVED); // SDK_SPLITS_ARRIVED emitted by main SyncManager
          }

          if (mainSyncManager.isRunning()) setTimeout(emitSdkReady);
          else sharedStarts.push(emitSdkReady);

          return {
            stop() { },
            flush,
          };
        }
      }
    );
  };
}
