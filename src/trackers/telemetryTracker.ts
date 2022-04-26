import { TelemetryCacheSync, TelemetryCacheAsync } from '../storages/types';
import { EXCEPTION, SDK_NOT_READY } from '../utils/labels';
import { ITelemetryTracker } from './types';
import { timer } from '../utils/timeTracker/timer';
import { NetworkError } from '../services/types';
import { TOKEN_REFRESH, AUTH_REJECTION } from '../utils/constants';

export function telemetryTrackerFactory(
  telemetryCache?: TelemetryCacheSync | TelemetryCacheAsync,
  now?: () => number
): ITelemetryTracker {

  if (telemetryCache && now) {
    const startTime = timer(now);

    return {
      trackEval(method) {
        const timeTracker = timer(now);

        return (label) => {
          telemetryCache.recordLatency(method, timeTracker());

          switch (label) {
            case EXCEPTION:
              telemetryCache.recordException(method); break;
            case SDK_NOT_READY: // @ts-ignore. TelemetryCacheAsync doesn't implement the method
              telemetryCache?.recordNonReadyUsage();
          }
        };
      },
      trackHttp(operation) {
        const timeTracker = timer(now);

        return (error?: NetworkError) => {
          (telemetryCache as TelemetryCacheSync).recordHttpLatency(operation, timeTracker());
          if (error && error.statusCode) (telemetryCache as TelemetryCacheSync).recordHttpError(operation, error.statusCode);
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
      streamingEvent: () => { }
    };
  }
}
