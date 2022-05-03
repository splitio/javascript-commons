import { syncTaskComposite } from '../syncTaskComposite';
import { eventsSubmitterFactory } from './eventsSubmitter';
import { impressionsSubmitterFactory } from './impressionsSubmitter';
import { impressionCountsSubmitterFactory } from './impressionCountsSubmitter';
import { ISyncManagerFactoryParams } from '../types';
import { ISyncManagerFactoryParamsWithTelemetry, telemetrySubmitterFactory } from './telemetrySubmitter';

export function submitterManagerFactory(params: ISyncManagerFactoryParams) {

  const { settings, storage, splitApi } = params;
  const log = settings.log;
  const submitters = [
    impressionsSubmitterFactory(log, splitApi.postTestImpressionsBulk, storage.impressions, settings.scheduler.impressionsRefreshRate, settings.core.labelsEnabled),
    eventsSubmitterFactory(log, splitApi.postEventsBulk, storage.events, settings.scheduler.eventsPushRate, settings.startup.eventsFirstPushWindow)
  ];
  if (storage.impressionCounts) submitters.push(impressionCountsSubmitterFactory(log, splitApi.postTestImpressionsCount, storage.impressionCounts));
  if (storage.telemetry) submitters.push(telemetrySubmitterFactory(params as ISyncManagerFactoryParamsWithTelemetry));
  return syncTaskComposite(submitters);
}
