
import { forOwn } from '../../utils/lang';
import { ICountsCacheSync, ILatenciesCacheSync } from '../../storages/types';
import { IPostMetricsCounters, IPostMetricsTimes } from '../../services/types';
import { ISyncTask, ITimeTracker } from '../types';
import { submitterSyncTaskFactory } from './submitterSyncTask';
import { ILogger } from '../../logger/types';

// extract POST payload object from cache
function fromCache<V>(propertyName: 'latencies' | 'delta') {
  return (data: Record<string, V>): any[] => {
    const result: any[] = [];

    forOwn(data, (value, key) => {
      result.push({ name: key, [propertyName]: value });
    });

    return result;
  };
}

/**
 * Sync task that periodically posts telemetry counts
 */
export function countsSyncTaskFactory(
  log: ILogger,
  postMetricsCounters: IPostMetricsCounters,
  countsCache: ICountsCacheSync,
  metricsRefreshRate: number,
  latencyTracker?: ITimeTracker
): ISyncTask {

  return submitterSyncTaskFactory(log, postMetricsCounters, countsCache, metricsRefreshRate, 'count metrics', latencyTracker, fromCache<number>('delta'));
}

/**
 * Sync task that periodically posts telemetry latencies
 */
export function latenciesSyncTaskFactory(
  log: ILogger,
  postMetricsLatencies: IPostMetricsTimes,
  latenciesCache: ILatenciesCacheSync,
  metricsRefreshRate: number,
  latencyTracker?: ITimeTracker
): ISyncTask {

  // don't retry metrics.
  return submitterSyncTaskFactory(log, postMetricsLatencies, latenciesCache, metricsRefreshRate, 'latency metrics', latencyTracker, fromCache<number[]>('latencies'), 0, true);
}
