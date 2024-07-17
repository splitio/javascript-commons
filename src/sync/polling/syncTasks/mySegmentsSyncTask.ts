import { ISegmentsCacheSync } from '../../../storages/types';
import { syncTaskFactory } from '../../syncTask';
import { IMySegmentsSyncTask } from '../types';
import { IFetchMySegments } from '../../../services/types';
import { mySegmentsFetcherFactory } from '../fetchers/mySegmentsFetcher';
import { ISettings } from '../../../types';
import { mySegmentsUpdaterFactory } from '../updaters/mySegmentsUpdater';

/**
 * Creates a sync task that periodically executes a `mySegmentsUpdater` task
 */
export function mySegmentsSyncTaskFactory(
  fetchMySegments: IFetchMySegments,
  mySegmentsCache: ISegmentsCacheSync,
  notifyUpdate: () => void,
  settings: ISettings,
  matchingKey: string,
  segmentsRefreshRate: number
): IMySegmentsSyncTask {
  return syncTaskFactory(
    settings.log,
    mySegmentsUpdaterFactory(
      settings.log,
      mySegmentsFetcherFactory(fetchMySegments),
      mySegmentsCache,
      notifyUpdate,
      settings.startup.requestTimeoutBeforeReady,
      settings.startup.retriesOnFailureBeforeReady,
      matchingKey
    ),
    segmentsRefreshRate,
    'mySegmentsUpdater',
  );
}
