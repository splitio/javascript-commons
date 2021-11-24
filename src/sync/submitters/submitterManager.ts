import { syncTaskComposite } from '../syncTaskComposite';
import { eventsSyncTaskFactory } from './eventsSyncTask';
import { impressionsSyncTaskFactory } from './impressionsSyncTask';
import { impressionCountsSyncTaskFactory } from './impressionCountsSyncTask';
import { ISplitApi } from '../../services/types';
import { IStorageSync } from '../../storages/types';
import { ISettings } from '../../types';

export function submitterManagerFactory(
  settings: ISettings,
  storage: IStorageSync,
  splitApi: ISplitApi,
) {
  const log = settings.log;
  const submitters = [
    impressionsSyncTaskFactory(log, splitApi.postTestImpressionsBulk, storage.impressions, settings.scheduler.impressionsRefreshRate, settings.core.labelsEnabled),
    eventsSyncTaskFactory(log, splitApi.postEventsBulk, storage.events, settings.scheduler.eventsPushRate, settings.startup.eventsFirstPushWindow)
    // @TODO add telemetry submitter
  ];
  if (storage.impressionCounts) submitters.push(impressionCountsSyncTaskFactory(log, splitApi.postTestImpressionsCount, storage.impressionCounts));
  return syncTaskComposite(submitters);
}
