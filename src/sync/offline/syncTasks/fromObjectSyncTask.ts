import { IReadinessManager } from '../../../readiness/types';
import { IStorageSync } from '../../../storages/types';
import { IDefinitionsParser } from '../splitsParser/types';
import { IDefinitionChangesResponse } from '../../../dtos/types';
import { syncTaskFactory } from '../../syncTask';
import { ISyncTask } from '../../types';
import { ISettings } from '../../../types';
import { SDK_DEFINITIONS_ARRIVED, SDK_SEGMENTS_ARRIVED, SDK_DEFINITIONS_CACHE_LOADED, FLAGS_UPDATE, SEGMENTS_UPDATE } from '../../../readiness/constants';
import { SYNC_OFFLINE_DATA, ERROR_SYNC_OFFLINE_LOADING } from '../../../logger/constants';

/**
 * Offline equivalent of `splitChangesUpdaterFactory`
 */
export function fromObjectUpdaterFactory(
  splitsParser: IDefinitionsParser,
  storage: Pick<IStorageSync, 'definitions' | 'validateCache'>,
  readiness: IReadinessManager,
  settings: ISettings,
): () => Promise<boolean> {

  const log = settings.log, definitions = storage.definitions;
  let startingUp = true;

  return function objectUpdater() {
    let changes: IDefinitionChangesResponse | undefined;
    try {
      changes = splitsParser(settings);
    } catch (err) {
      log.error(ERROR_SYNC_OFFLINE_LOADING, [err]);
    }

    if (!changes || !changes.d) return Promise.resolve(true);

    const { updated, removed, till } = changes.d;
    log.debug(SYNC_OFFLINE_DATA, [JSON.stringify(changes.d)]);

    // On start, clear definitions that might be in the storage from a previous session (InLocalStorage), since the parser only tracks its own changes.
    return Promise.resolve(startingUp && definitions.clear()).then(() => {
      return definitions.update(updated, removed, till);
    }).then((names) => {
      readiness.definitions.emit(SDK_DEFINITIONS_ARRIVED, { type: FLAGS_UPDATE, names });

      if (startingUp) {
        startingUp = false;
        Promise.resolve(storage.validateCache ? storage.validateCache() : { initialCacheLoad: true /* Fallback: assume initial load when validateCache doesn't exist */ }).then((cacheMetadata) => {
          // Emits SDK_READY_FROM_CACHE
          if (!cacheMetadata.initialCacheLoad) {
            readiness.definitions.emit(SDK_DEFINITIONS_CACHE_LOADED, cacheMetadata);
          }
          // Emits SDK_READY
          readiness.segments.emit(SDK_SEGMENTS_ARRIVED, { type: SEGMENTS_UPDATE, names: [] });
        });
      }
      return true;
    });
  };
}

/**
 * PollingManager in Offline mode
 */
export function fromObjectSyncTaskFactory(
  splitsParser: IDefinitionsParser,
  storage: Pick<IStorageSync, 'definitions' | 'validateCache'>,
  readiness: IReadinessManager,
  settings: ISettings
): ISyncTask<[], boolean> {
  return syncTaskFactory(
    settings.log,
    fromObjectUpdaterFactory(
      splitsParser,
      storage,
      readiness,
      settings,
    ),
    settings.scheduler.offlineRefreshRate,
    'offlineUpdater',
  );
}
