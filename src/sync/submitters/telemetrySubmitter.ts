import { ITelemetryCacheSync } from '../../storages/types';
import { submitterFactory, firstPushWindowDecorator } from './submitter';
import { TelemetryUsageStatsPayload } from './types';
import { QUEUED, DEDUPED, DROPPED } from '../../utils/constants';
import { ISyncManagerFactoryParams } from '../types';

export type ISyncManagerFactoryParamsWithTelemetry = ISyncManagerFactoryParams & { storage: { telemetry: ITelemetryCacheSync } }

/**
 * Converts data from telemetry cache into /metrics/usage request payload.
 */
export function telemetryCacheStatsAdapter({ splits, segments, telemetry }: ISyncManagerFactoryParamsWithTelemetry['storage']) {
  return {
    isEmpty() { return false; }, // There is always data in telemetry cache
    clear() { }, //  No-op

    // @TODO consider moving inside telemetry cache for code size reduction
    state(): TelemetryUsageStatsPayload {
      return {
        lS: telemetry.getLastSynchronization(),
        mL: telemetry.popLatencies(),
        mE: telemetry.popExceptions(),
        hE: telemetry.popHttpErrors(),
        hL: telemetry.popHttpLatencies(),
        tR: telemetry.popTokenRefreshes(),
        aR: telemetry.popAuthRejections(),
        iQ: telemetry.getImpressionStats(QUEUED),
        iDe: telemetry.getImpressionStats(DEDUPED),
        iDr: telemetry.getImpressionStats(DROPPED),
        spC: splits.getSplitNames().length,
        seC: segments.getRegisteredSegments().length,
        skC: segments.getKeysCount(),
        sL: telemetry.getSessionLength(),
        eQ: telemetry.getEventStats(QUEUED),
        eD: telemetry.getEventStats(DROPPED),
        sE: telemetry.popStreamingEvents(),
        t: telemetry.popTags(),
      };
    }
  };
}

/**
 * Submitter that periodically posts telemetry data
 */
export function telemetrySubmitterFactory(params: ISyncManagerFactoryParamsWithTelemetry) {
  const { settings: { log, scheduler: { telemetryRefreshRate } }, storage, splitApi } = params;

  return firstPushWindowDecorator(
    submitterFactory(log, splitApi.postMetricsUsage, telemetryCacheStatsAdapter(storage), telemetryRefreshRate, 'telemetry stats', undefined, 0, true),
    telemetryRefreshRate
  );
}
