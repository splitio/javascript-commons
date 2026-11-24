import { IStorageSync } from '../../../storages/types';
import { IReadinessManager } from '../../../readiness/types';
import { syncTaskFactory } from '../../syncTask';
import { IMySegmentsSyncTask } from '../types';
import { ISettings } from '../../../types';
import { mySegmentsUpdaterFactory } from '../updaters/mySegmentsUpdater';
import { IMySegmentsFetcher } from '../fetchers/types';

/**
 * Creates a sync task that periodically executes a `mySegmentsUpdater` task
 */
export function mySegmentsSyncTaskFactory(
  mySegmentsFetcher: IMySegmentsFetcher,
  storage: IStorageSync,
  readiness: IReadinessManager,
  settings: ISettings,
  matchingKey: string
): IMySegmentsSyncTask {
  return syncTaskFactory(
    settings.log,
    mySegmentsUpdaterFactory(
      settings.log,
      mySegmentsFetcher,
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
