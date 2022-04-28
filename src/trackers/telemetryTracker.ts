import { TelemetryCacheSync, TelemetryCacheAsync } from '../storages/types';
import { EXCEPTION, SDK_NOT_READY } from '../utils/labels';
import { ITelemetryTracker } from './types';
import { timer } from '../utils/timeTracker/timer';
import { TOKEN_REFRESH, AUTH_REJECTION } from '../utils/constants';

export function telemetryTrackerFactory(
  telemetryCache?: TelemetryCacheSync | TelemetryCacheAsync,
  now?: () => number
): ITelemetryTracker {

  if (telemetryCache && now) {
    const startTime = timer(now);

    return {
      trackEval(method) {
        const evalTime = timer(now);

        return (label) => {
          switch (label) {
            case EXCEPTION:
              telemetryCache.recordException(method);
              return; // Don't track latency on exceptions
            case SDK_NOT_READY: // @ts-ignore. TelemetryCacheAsync doesn't implement the method
              telemetryCache?.recordNonReadyUsage();
          }
          telemetryCache.recordLatency(method, evalTime());
        };
      },
      trackHttp(operation) {
        const httpTime = timer(now);

        return (error) => {
          (telemetryCache as TelemetryCacheSync).recordHttpLatency(operation, httpTime());
          if (error && error.statusCode) (telemetryCache as TelemetryCacheSync).recordHttpError(operation, error.statusCode);
          else (telemetryCache as TelemetryCacheSync).recordSuccessfulSync(operation, now());
        };
      },
      sessionLength() {
        (telemetryCache as TelemetryCacheSync).recordSessionLength(startTime());
      },
      streamingEvent(e, d) {
        if (e === AUTH_REJECTION) {
          (telemetryCache as TelemetryCacheSync).recordAuthRejections();
        } else {
          (telemetryCache as TelemetryCacheSync).recordStreamingEvents({
            e, d, t: now()
          });
          if (e === TOKEN_REFRESH) (telemetryCache as TelemetryCacheSync).recordTokenRefreshes();
        }
      }
    };

  } else { // If there is not `telemetryCache` or `now` time tracker, return a no-op telemetry tracker
    const noopTrack = () => () => { };
    return {
      trackEval: noopTrack,
      trackHttp: noopTrack,
      sessionLength: () => { },
      streamingEvent: () => { },
    };
  }
}
