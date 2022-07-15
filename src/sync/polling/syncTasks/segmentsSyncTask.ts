import { IStorageSync } from '../../../storages/types';
import { IReadinessManager } from '../../../readiness/types';
import { syncTaskFactory } from '../../syncTask';
import { ISegmentsSyncTask } from '../types';
import { segmentChangesFetcherFactory } from '../fetchers/segmentChangesFetcher';
import { IFetchSegmentChanges } from '../../../services/types';
import { ISettings } from '../../../types';
import { segmentChangesUpdaterFactory } from '../updaters/segmentChangesUpdater';

/**
 * Creates a sync task that periodically executes a `segmentChangesUpdater` task
 */
export function segmentsSyncTaskFactory(
  fetchSegmentChanges: IFetchSegmentChanges,
  storage: IStorageSync,
  readiness: IReadinessManager,
  settings: ISettings,
): ISegmentsSyncTask {
  return syncTaskFactory(
    settings.log,
    segmentChangesUpdaterFactory(
      settings.log,
      segmentChangesFetcherFactory(fetchSegmentChanges),
      storage.segments,
      readiness,
    ),
    settings.scheduler.segmentsRefreshRate,
    'segmentChangesUpdater'
  );
}
