import { ISyncTask, ITimeTracker } from '../types';
import { IPostTestImpressionsCount } from '../../services/types';
import { IImpressionCountsCacheSync } from '../../storages/types';
import { submitterSyncTaskFactory } from './submitterSyncTask';
import { ImpressionCountsPayload } from './types';
import { ILogger } from '../../logger/types';

/**
 * Converts `impressionCounts` data from cache into request payload.
 */
export function fromImpressionCountsCollector(impressionsCount: Record<string, number>): ImpressionCountsPayload {
  const pf = [];
  const keys = Object.keys(impressionsCount);
  for (let i = 0; i < keys.length; i++) {
    const splitted = keys[i].split('::');
    if (splitted.length !== 2) continue;
    const featureName = splitted[0];
    const timeFrame = splitted[1];

    const impressionsInTimeframe = {
      f: featureName, // Test Name
      m: Number(timeFrame), // Time Frame
      rc: impressionsCount[keys[i]] // Count
    };

    pf.push(impressionsInTimeframe);
  }

  return { pf };
}

const IMPRESSIONS_COUNT_RATE = 1800000; // 30 minutes

/**
 * Sync task that periodically posts impression counts
 */
export function impressionCountsSyncTaskFactory(
  log: ILogger,
  postTestImpressionsCount: IPostTestImpressionsCount,
  impressionCountsCache: IImpressionCountsCacheSync,
  latencyTracker?: ITimeTracker
): ISyncTask {

  // retry impressions counts only once.
  return submitterSyncTaskFactory(log, postTestImpressionsCount, impressionCountsCache, IMPRESSIONS_COUNT_RATE, 'impression counts', latencyTracker, fromImpressionCountsCollector, 1);
}
