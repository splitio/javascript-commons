import { TelemetryCacheSync, TelemetryCacheAsync } from '../storages/types';
import { Method, OperationType } from '../sync/submitters/types';
import { EXCEPTION, SDK_NOT_READY } from '../utils/labels';
import { ITelemetryTracker } from './types';
import { timer } from '../utils/timeTracker/timer';
import { NetworkError } from '../services/types';

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
      },
      trackHttp(operation: OperationType) {
        const timeTracker = timer(now);

        return (error?: NetworkError) => {
          (telemetryCache as TelemetryCacheSync).recordHttpLatency(operation, timeTracker());
          if (error && error.statusCode) (telemetryCache as TelemetryCacheSync).recordHttpError(operation, error.statusCode);
          else (telemetryCache as TelemetryCacheSync).recordSuccessfulSync(operation, now());
        };
      },
    };

  } else { // If there is not `telemetryCache` or `now` time tracker, return a no-op telemetry tracker
    const noopTrack = () => () => { };
    return {
      trackEval: noopTrack,
      trackHttp: noopTrack
    };
  }
}
