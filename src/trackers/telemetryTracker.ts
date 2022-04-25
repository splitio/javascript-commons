import { TelemetryCacheSync, TelemetryCacheAsync } from '../storages/types';
import { Method } from '../sync/submitters/types';
import { EXCEPTION, SDK_NOT_READY } from '../utils/labels';
import { ITelemetryTracker } from './types';
import { timer } from '../utils/timeTracker/timer';

export function telemetryTrackerFactory(
  telemetryCache?: TelemetryCacheSync | TelemetryCacheAsync,
  now?: () => number
): ITelemetryTracker {

  if (telemetryCache && now) {

    return {
      trackEval(method: Method) {
        const stopTimer = timer(now);

        return (label?: string) => {
          switch (label) {
            case EXCEPTION:
              telemetryCache.recordException(method);
              return; // Don't track latency on exceptions
            case SDK_NOT_READY: // @ts-ignore. TelemetryCacheAsync doesn't implement the method
              telemetryCache?.recordNonReadyUsage();
          }
          telemetryCache.recordLatency(method, stopTimer());
        };
      }
    };

  } else { // If there is not `telemetryCache` or `now` time tracker, return a no-op telemetry tracker
    const noopTrack = () => () => { };
    return {
      trackEval: noopTrack
    };
  }
}
