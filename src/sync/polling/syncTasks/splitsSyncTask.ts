import { IStorageSync } from '../../../storages/types';
import { IReadinessManager } from '../../../readiness/types';
import { syncTaskFactory } from '../../syncTask';
import { ISplitsSyncTask } from '../types';
import { splitChangesFetcherFactory } from '../fetchers/splitChangesFetcher';
import { IFetchSplitChanges } from '../../../services/types';
import { ISettings } from '../../../types';
import { splitChangesUpdaterFactory } from '../updaters/splitChangesUpdater';

/**
 * Creates a sync task that periodically executes a `splitChangesUpdater` task
 */
export function splitsSyncTaskFactory(
  fetchSplitChanges: IFetchSplitChanges,
  storage: IStorageSync,
  readiness: IReadinessManager,
  settings: ISettings,
  isClientSide?: boolean
): ISplitsSyncTask {
  return syncTaskFactory(
    settings.log,
    splitChangesUpdaterFactory(
      settings.log,
      splitChangesFetcherFactory(fetchSplitChanges),
      storage.splits,
      storage.segments,
      readiness.splits,
      settings.startup.requestTimeoutBeforeReady,
      settings.startup.retriesOnFailureBeforeReady,
      isClientSide
    ),
    settings.scheduler.featuresRefreshRate,
    'splitChangesUpdater',
  );
}
