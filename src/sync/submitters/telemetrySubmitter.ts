import { ITelemetryCacheSync } from '../../storages/types';
import { submitterFactory, firstPushWindowDecorator } from './submitter';
import { TelemetryUsageStatsPayload, TelemetryConfigStatsPayload } from './types';
import { QUEUED, DEDUPED, DROPPED, CONSUMER_MODE, CONSUMER_ENUM, STANDALONE_MODE, CONSUMER_PARTIAL_MODE, STANDALONE_ENUM, CONSUMER_PARTIAL_ENUM, OPTIMIZED, DEBUG, DEBUG_ENUM, OPTIMIZED_ENUM } from '../../utils/constants';
import { SDK_READY, SDK_READY_FROM_CACHE } from '../../readiness/constants';
import { ISettings } from '../../types';
import { base } from '../../utils/settingsValidation';
import { usedKeysMap } from '../../utils/inputValidation/apiKey';
import { ISyncManagerFactoryParams } from '../types';
import { timer } from '../../utils/timeTracker/timer';

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

const OPERATION_MODE_MAP = {
  [STANDALONE_MODE]: STANDALONE_ENUM,
  [CONSUMER_MODE]: CONSUMER_ENUM,
  [CONSUMER_PARTIAL_MODE]: CONSUMER_PARTIAL_ENUM
} as Record<ISettings['mode'], (0 | 1 | 2)>;

const IMPRESSIONS_MODE_MAP = {
  [OPTIMIZED]: OPTIMIZED_ENUM,
  [DEBUG]: DEBUG_ENUM
} as Record<ISettings['sync']['impressionsMode'], (0 | 1)>;

function getActiveFactories() {
  return Object.keys(usedKeysMap).length;
}

function getRedundantActiveFactories() {
  return Object.keys(usedKeysMap).reduce((acum, apiKey) => {
    return acum + usedKeysMap[apiKey] - 1;
  }, 0);
}

/**
 * Converts data from telemetry cache and settings into /metrics/config request payload.
 */
export function telemetryCacheConfigAdapter(settings: ISettings, telemetryCache: ITelemetryCacheSync) {
  return {
    isEmpty() { return false; },
    clear() { },

    state(): TelemetryConfigStatsPayload {
      const { urls, scheduler } = settings;

      return {
        oM: OPERATION_MODE_MAP[settings.mode], // @ts-ignore lower case of storage type
        st: settings.storage.type.toLowerCase(),
        sE: settings.streamingEnabled,
        rR: {
          sp: scheduler.featuresRefreshRate,
          se: scheduler.segmentsRefreshRate,
          im: scheduler.impressionsRefreshRate,
          ev: scheduler.eventsPushRate,
          te: scheduler.telemetryRefreshRate,
        }, // refreshRates
        uO: {
          s: urls.sdk !== base.urls.sdk,
          e: urls.events !== base.urls.events,
          a: urls.auth !== base.urls.auth,
          st: urls.streaming !== base.urls.streaming,
          t: urls.telemetry !== base.urls.telemetry,
        }, // urlOverrides
        iQ: scheduler.impressionsQueueSize,
        eQ: scheduler.eventsQueueSize,
        iM: IMPRESSIONS_MODE_MAP[settings.sync.impressionsMode],
        iL: settings.impressionListener ? true : false,
        hP: false, // @TODO proxy not supported
        aF: getActiveFactories(),
        rF: getRedundantActiveFactories(),
        tR: telemetryCache.getTimeUntilReady() as number,
        tC: telemetryCache.getTimeUntilReadyFromCache(),
        nR: telemetryCache.getNonReadyUsage(),
        t: telemetryCache.popTags(),
        i: settings.integrations && settings.integrations.map(int => int.type),
      };
    }
  };
}

/**
 * Submitter that periodically posts telemetry data
 */
export function telemetrySubmitterFactory(params: ISyncManagerFactoryParamsWithTelemetry) {
  const { settings, settings: { log, scheduler: { telemetryRefreshRate } }, storage, splitApi, platform: { now }, readiness } = params;
  const startTime = timer(now || Date.now);

  const submitter = firstPushWindowDecorator(
    submitterFactory(log, splitApi.postMetricsUsage, telemetryCacheStatsAdapter(storage), telemetryRefreshRate, 'telemetry stats', undefined, 0, true),
    telemetryRefreshRate
  );

  readiness.gate.once(SDK_READY_FROM_CACHE, () => {
    storage.telemetry.recordTimeUntilReadyFromCache(startTime());
  });

  readiness.gate.once(SDK_READY, () => {
    storage.telemetry.recordTimeUntilReady(startTime());

    // Post config data when the SDK is ready and if the telemetry submitter was started
    if (submitter.isRunning()) {
      const postMetricsConfigTask = submitterFactory(log, splitApi.postMetricsConfig, telemetryCacheConfigAdapter(settings, storage.telemetry), 0, 'telemetry config', undefined, 0, true);
      postMetricsConfigTask.execute();
    }
  });

  return submitter;
}
