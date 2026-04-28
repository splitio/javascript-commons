import { forOwn } from '../../../utils/lang';
import { IReadinessManager } from '../../../readiness/types';
import { IStorageSync } from '../../../storages/types';
import { IDefinitionsParser, IDefinitionPartial } from '../splitsParser/types';
import { IDefinition } from '../../../dtos/types';
import { syncTaskFactory } from '../../syncTask';
import { ISyncTask } from '../../types';
import { ISettings } from '../../../types';
import { CONTROL } from '../../../utils/constants';
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
    const splits: IDefinition[] = [];
    let loadError = null;
    let splitsMock: false | Record<string, IDefinitionPartial> = {};
    try {
      splitsMock = splitsParser(settings);
    } catch (err) {
      loadError = err;
      log.error(ERROR_SYNC_OFFLINE_LOADING, [err]);
    }

    if (!loadError && splitsMock) {
      log.debug(SYNC_OFFLINE_DATA, [JSON.stringify(splitsMock)]);

      forOwn(splitsMock, (val, name) => {
        // @ts-ignore Split changeNumber and seed is undefined in localhost mode
        splits.push({
          name,
          status: 'ACTIVE',
          killed: false,
          trafficAllocation: 100,
          defaultTreatment: CONTROL,
          conditions: val.conditions || [],
          configurations: val.configurations,
          trafficTypeName: val.trafficTypeName
        });
      });

      return Promise.all([
        definitions.clear(), // required to sync removed splits from mock
        definitions.update(splits, [], Date.now())
      ]).then(() => {
        readiness.definitions.emit(SDK_DEFINITIONS_ARRIVED, { type: FLAGS_UPDATE, names: [] });

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
    } else {
      return Promise.resolve(true);
    }
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
