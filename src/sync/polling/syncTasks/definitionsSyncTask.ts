import { IStorageSync } from '../../../storages/types';
import { IReadinessManager } from '../../../readiness/types';
import { syncTaskFactory } from '../../syncTask';
import { IDefinitionsSyncTask, ISegmentsSyncTask } from '../types';
import { ISettings } from '../../../types';
import { definitionChangesUpdaterFactory } from '../updaters/definitionChangesUpdater';
import { IDefinitionChangesFetcher } from '../fetchers/types';

/**
 * Creates a sync task that periodically executes a `definitionChangesUpdater` task
 */
export function definitionsSyncTaskFactory(
  definitionChangesFetcher: IDefinitionChangesFetcher,
  storage: IStorageSync,
  readiness: IReadinessManager,
  settings: ISettings,
  segmentsSyncTask?: ISegmentsSyncTask // undefined for client-side
): IDefinitionsSyncTask {
  return syncTaskFactory(
    settings.log,
    definitionChangesUpdaterFactory(
      settings.log,
      definitionChangesFetcher,
      storage,
      settings.sync.__splitFiltersValidation,
      readiness.definitions,
      settings.startup.requestTimeoutBeforeReady,
      settings.startup.retriesOnFailureBeforeReady,
      segmentsSyncTask
    ),
    settings.scheduler.featuresRefreshRate,
    'definitionChangesUpdater',
  );
}
