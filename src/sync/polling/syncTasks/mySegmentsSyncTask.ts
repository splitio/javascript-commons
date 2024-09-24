import { IStorageSync } from '../../../storages/types';
import { IReadinessManager } from '../../../readiness/types';
import { syncTaskFactory } from '../../syncTask';
import { IMySegmentsSyncTask } from '../types';
import { IFetchMemberships } from '../../../services/types';
import { mySegmentsFetcherFactory } from '../fetchers/mySegmentsFetcher';
import { ISettings } from '../../../types';
import { mySegmentsUpdaterFactory } from '../updaters/mySegmentsUpdater';

/**
 * Creates a sync task that periodically executes a `mySegmentsUpdater` task
 */
export function mySegmentsSyncTaskFactory(
  fetchMemberships: IFetchMemberships,
  storage: IStorageSync,
  readiness: IReadinessManager,
  settings: ISettings,
  matchingKey: string
): IMySegmentsSyncTask {
  return syncTaskFactory(
    settings.log,
    mySegmentsUpdaterFactory(
      settings.log,
      mySegmentsFetcherFactory(fetchMemberships),
      storage,
      readiness.segments,
      settings.startup.requestTimeoutBeforeReady,
      settings.startup.retriesOnFailureBeforeReady,
      matchingKey
    ),
    settings.scheduler.segmentsRefreshRate,
    'mySegmentsUpdater',
  );
}
