import { IStorageSync } from '../../../storages/types';
import { IReadinessManager } from '../../../readiness/types';
import { syncTaskFactory } from '../../syncTask';
import { ISplitsSyncTask } from '../types';
import { splitChangesFetcherFactory } from '../fetchers/splitChangesFetcher';
import { configsFetcherFactory } from '../fetchers/configsFetcher';
import { IFetchDefinitionChanges } from '../../../services/types';
import { ISettings } from '../../../types';
import { splitChangesUpdaterFactory } from '../updaters/splitChangesUpdater';
import { isFetchingConfigs } from '../pollingManagerSS';

/**
 * Creates a sync task that periodically executes a `splitChangesUpdater` task
 */
export function splitsSyncTaskFactory(
  fetchSplitChanges: IFetchDefinitionChanges,
  storage: IStorageSync,
  readiness: IReadinessManager,
  settings: ISettings,
  isClientSide?: boolean
): ISplitsSyncTask {
  const fetcher = isFetchingConfigs(settings)
    ? configsFetcherFactory(fetchSplitChanges)
    : splitChangesFetcherFactory(fetchSplitChanges, settings, storage);
  return syncTaskFactory(
    settings.log,
    splitChangesUpdaterFactory(
      settings,
      fetcher,
      storage,
      settings.sync.__splitFiltersValidation,
      readiness.splits,
      settings.startup.requestTimeoutBeforeReady,
      settings.startup.retriesOnFailureBeforeReady,
      isClientSide
    ),
    isFetchingConfigs(settings) ? settings.scheduler.configsRefreshRate : settings.scheduler.featuresRefreshRate,
    isFetchingConfigs(settings) ? 'configsUpdater' : 'splitChangesUpdater',
  );
}
