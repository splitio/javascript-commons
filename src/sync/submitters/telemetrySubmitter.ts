import { ISegmentsCacheSync, ISplitsCacheSync, ITelemetryCacheSync } from '../../storages/types';
import { submitterFactory, firstPushWindowDecorator } from './submitter';
import { TelemetryUsageStatsPayload, TelemetryConfigStatsPayload, TelemetryConfigStats } from './types';
import { QUEUED, DEDUPED, DROPPED, CONSUMER_MODE, CONSUMER_ENUM, STANDALONE_MODE, CONSUMER_PARTIAL_MODE, STANDALONE_ENUM, CONSUMER_PARTIAL_ENUM, OPTIMIZED, DEBUG, DEBUG_ENUM, OPTIMIZED_ENUM, CONSENT_GRANTED, CONSENT_DECLINED, CONSENT_UNKNOWN } from '../../utils/constants';
import { SDK_READY, SDK_READY_FROM_CACHE } from '../../readiness/constants';
import { ConsentStatus, ISettings, SDKMode } from '../../types';
import { base } from '../../utils/settingsValidation';
import { usedKeysMap } from '../../utils/inputValidation/apiKey';
import { timer } from '../../utils/timeTracker/timer';
import { ISdkFactoryContextSync } from '../../sdkFactory/types';
import { objectAssign } from '../../utils/lang/objectAssign';

/**
 * Converts data from telemetry cache into /metrics/usage request payload.
 */
export function telemetryCacheStatsAdapter(telemetry: ITelemetryCacheSync, splits: ISplitsCacheSync, segments: ISegmentsCacheSync) {
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

const USER_CONSENT_MAP = {
  [CONSENT_UNKNOWN]: 1,
  [CONSENT_GRANTED]: 2,
  [CONSENT_DECLINED]: 3
} as Record<ConsentStatus, number>;

function getActiveFactories() {
  return Object.keys(usedKeysMap).length;
}

function getRedundantActiveFactories() {
  return Object.keys(usedKeysMap).reduce((acum, apiKey) => {
    return acum + usedKeysMap[apiKey] - 1;
  }, 0);
}

export function getTelemetryConfigStats(mode: SDKMode, storageType: string): TelemetryConfigStats {
  return {
    oM: OPERATION_MODE_MAP[mode], // @ts-ignore lower case of storage type
    st: storageType.toLowerCase(),
    aF: getActiveFactories(),
    rF: getRedundantActiveFactories(),
  };
}

/**
 * Converts data from telemetry cache and settings into /metrics/config request payload.
 */
export function telemetryCacheConfigAdapter(telemetry: ITelemetryCacheSync, settings: ISettings) {
  return {
    isEmpty() { return false; },
    clear() { },

    state(): TelemetryConfigStatsPayload {
      const { urls, scheduler } = settings;

      return objectAssign(getTelemetryConfigStats(settings.mode, settings.storage.type), {
        sE: settings.streamingEnabled,
        rR: {
          sp: scheduler.featuresRefreshRate / 1000,
          se: scheduler.segmentsRefreshRate / 1000,
          im: scheduler.impressionsRefreshRate / 1000,
          ev: scheduler.eventsPushRate / 1000,
          te: scheduler.telemetryRefreshRate / 1000,
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
        tR: telemetry.getTimeUntilReady() as number,
        tC: telemetry.getTimeUntilReadyFromCache(),
        nR: telemetry.getNonReadyUsage(),
        t: telemetry.popTags(),
        i: settings.integrations && settings.integrations.map(int => int.type),
        uC: settings.userConsent ? USER_CONSENT_MAP[settings.userConsent] : 0
      });
    }
  };
}

/**
 * Submitter that periodically posts telemetry data
 */
export function telemetrySubmitterFactory(params: ISdkFactoryContextSync) {
  const { storage: { splits, segments, telemetry } } = params;
  if (!telemetry) return; // No submitter created if telemetry cache is not defined

  const { settings, settings: { log, scheduler: { telemetryRefreshRate } }, splitApi, platform: { now }, readiness, sdkReadinessManager } = params;
  const startTime = timer(now || Date.now);

  const submitter = firstPushWindowDecorator(
    submitterFactory(log, splitApi.postMetricsUsage, telemetryCacheStatsAdapter(telemetry, splits, segments), telemetryRefreshRate, 'telemetry stats', undefined, 0, true),
    telemetryRefreshRate
  );

  readiness.gate.once(SDK_READY_FROM_CACHE, () => {
    telemetry.recordTimeUntilReadyFromCache(startTime());
  });

  sdkReadinessManager.incInternalReadyCbCount();
  readiness.gate.once(SDK_READY, () => {
    telemetry.recordTimeUntilReady(startTime());

    // Post config data when the SDK is ready and if the telemetry submitter was started
    if (submitter.isRunning()) {
      const postMetricsConfigTask = submitterFactory(log, splitApi.postMetricsConfig, telemetryCacheConfigAdapter(telemetry, settings), 0, 'telemetry config', undefined, 0, true);
      postMetricsConfigTask.execute();
    }
  });

  return submitter;
}
