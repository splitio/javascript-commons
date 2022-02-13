import { syncTaskComposite } from '../syncTaskComposite';
import { eventsSyncTaskFactory } from './eventsSyncTask';
import { impressionsSyncTaskFactory } from './impressionsSyncTask';
import { impressionCountsSyncTaskFactory } from './impressionCountsSyncTask';
import { ISyncManagerFactoryParams } from '../types';

export function submitterManagerFactory(params: ISyncManagerFactoryParams) {

  const { settings, storage, splitApi } = params;
  const log = settings.log;
  const submitters = [
    impressionsSyncTaskFactory(log, splitApi.postTestImpressionsBulk, storage.impressions, settings.scheduler.impressionsRefreshRate, settings.core.labelsEnabled),
    eventsSyncTaskFactory(log, splitApi.postEventsBulk, storage.events, settings.scheduler.eventsPushRate, settings.startup.eventsFirstPushWindow)
    // @TODO add telemetry submitter
  ];
  if (storage.impressionCounts) submitters.push(impressionCountsSyncTaskFactory(log, splitApi.postTestImpressionsCount, storage.impressionCounts));
  return syncTaskComposite(submitters);
}
