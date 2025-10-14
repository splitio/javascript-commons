import { ITelemetryCacheSync, ITelemetryCacheAsync } from '../storages/types';
import { EXCEPTION, SDK_NOT_READY } from '../utils/labels';
import { ITelemetryTracker } from './types';
import { timer } from '../utils/timeTracker/timer';
import { TOKEN_REFRESH, AUTH_REJECTION } from '../utils/constants';
import { UpdatesFromSSEEnum } from '../sync/submitters/types';

export function telemetryTrackerFactory(
  telemetryCache?: ITelemetryCacheSync | ITelemetryCacheAsync,
  now?: () => number
): ITelemetryTracker {

  if (telemetryCache && now) {
    const sessionTimer = timer(now);

    return {
      trackEval(method) {
        const evalTimer = timer(now);

        return (label) => {
          switch (label) {
            case EXCEPTION:
              telemetryCache.recordException(method);
              return; // Don't track latency on exceptions
            case SDK_NOT_READY: // @ts-ignore ITelemetryCacheAsync doesn't implement the method
              if (telemetryCache.recordNonReadyUsage) telemetryCache.recordNonReadyUsage();
          }
          telemetryCache.recordLatency(method, evalTimer());
        };
      },
      trackHttp(operation) {
        const httpTimer = timer(now);

        return (error) => {
          (telemetryCache as ITelemetryCacheSync).recordHttpLatency(operation, httpTimer());
          if (error && error.statusCode) (telemetryCache as ITelemetryCacheSync).recordHttpError(operation, error.statusCode);
          else (telemetryCache as ITelemetryCacheSync).recordSuccessfulSync(operation, Date.now());
        };
      },
      sessionLength() { // @ts-ignore ITelemetryCacheAsync doesn't implement the method
        if (telemetryCache.recordSessionLength) telemetryCache.recordSessionLength(sessionTimer());
      },
      streamingEvent(e, d) {
        if (e === AUTH_REJECTION) {
          (telemetryCache as ITelemetryCacheSync).recordAuthRejections();
        } else {
          (telemetryCache as ITelemetryCacheSync).recordStreamingEvents({
            e, d, t: Date.now()
          });
          if (e === TOKEN_REFRESH) (telemetryCache as ITelemetryCacheSync).recordTokenRefreshes();
        }
      },
      addTag(tag: string) {
        // @ts-ignore
        if (telemetryCache.addTag) telemetryCache.addTag(tag);
      },
      trackUpdatesFromSSE(type: UpdatesFromSSEEnum) {
        (telemetryCache as ITelemetryCacheSync).recordUpdatesFromSSE(type);
      }
    };

  } else { // If there is not `telemetryCache` or `now` time tracker, return a no-op telemetry tracker
    const noopTrack = () => () => { };
    return {
      trackEval: noopTrack,
      trackHttp: noopTrack,
      sessionLength() { },
      streamingEvent() { },
      addTag() { },
      trackUpdatesFromSSE() { },
    };
  }
}
