import { ISegmentsCacheSync } from '../../../storages/types';
import { syncTaskFactory } from '../../syncTask';
import { IMySegmentsSyncTask } from '../types';
import { IFetchMySegments } from '../../../services/types';
import { mySegmentsFetcherFactory } from '../fetchers/mySegmentsFetcher';
import { ISettings } from '../../../types';
import { mySegmentsUpdaterFactory } from '../updaters/mySegmentsUpdater';
import { ISegmentsEventEmitter } from '../../../readiness/types';

/**
 * Creates a sync task that periodically executes a `mySegmentsUpdater` task
 */
export function mySegmentsSyncTaskFactory(
  fetchMySegments: IFetchMySegments,
  shouldNotify: () => boolean,
  mySegmentsCache: ISegmentsCacheSync,
  segmentEventEmitter: ISegmentsEventEmitter,
  settings: ISettings,
  matchingKey: string,
  segmentsRefreshRate: number,
  NAME: string
): IMySegmentsSyncTask {
  return syncTaskFactory(
    settings.log,
    mySegmentsUpdaterFactory(
      settings.log,
      mySegmentsFetcherFactory(fetchMySegments),
      shouldNotify,
      mySegmentsCache,
      segmentEventEmitter,
      settings.startup.requestTimeoutBeforeReady,
      settings.startup.retriesOnFailureBeforeReady,
      matchingKey
    ),
    segmentsRefreshRate,
    NAME,
  );
}
