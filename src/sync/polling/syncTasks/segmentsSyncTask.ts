import { IStorageSync } from '../../../storages/types';
import { IReadinessManager } from '../../../readiness/types';
import { syncTaskFactory } from '../../syncTask';
import { ISegmentsSyncTask } from '../types';
import { ISettings } from '../../../types';
import { segmentChangesUpdaterFactory } from '../updaters/segmentChangesUpdater';
import { ISegmentChangesFetcher } from '../fetchers/types';

/**
 * Creates a sync task that periodically executes a `segmentChangesUpdater` task
 */
export function segmentsSyncTaskFactory(
  segmentChangesFetcher: ISegmentChangesFetcher,
  storage: IStorageSync,
  readiness: IReadinessManager,
  settings: ISettings,
): ISegmentsSyncTask {
  return syncTaskFactory(
    settings.log,
    segmentChangesUpdaterFactory(
      settings.log,
      segmentChangesFetcher,
      storage.segments,
      readiness,
      settings.startup.requestTimeoutBeforeReady,
      settings.startup.retriesOnFailureBeforeReady,
    ),
    settings.scheduler.segmentsRefreshRate,
    'segmentChangesUpdater'
  );
}
