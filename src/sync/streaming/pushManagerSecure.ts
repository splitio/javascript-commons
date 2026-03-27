import { IPushEventEmitter, IPushManager } from './types';
import { ISSEClient } from './SSEClient/types';
import { IPollingManager, ISegmentsSyncTask } from '../polling/types';
import { objectAssign } from '../../utils/lang/objectAssign';
import { Backoff } from '../../utils/Backoff';
import { SSEHandlerFactory } from './SSEHandler';
import { SegmentsUpdateWorker } from './UpdateWorkers/SegmentsUpdateWorker';
import { SplitsUpdateWorker } from './UpdateWorkers/SplitsUpdateWorker';
import { SSEClient } from './SSEClient';
import { PUSH_NONRETRYABLE_ERROR, PUSH_SUBSYSTEM_DOWN, SEGMENT_UPDATE, SPLIT_KILL, SPLIT_UPDATE, RB_SEGMENT_UPDATE, PUSH_RETRYABLE_ERROR, PUSH_SUBSYSTEM_UP, SECONDS_BEFORE_EXPIRATION, ControlType } from './constants';
import { STREAMING_FALLBACK, STREAMING_REFRESH_TOKEN, STREAMING_CONNECTING, STREAMING_DISABLED, ERROR_STREAMING_AUTH, STREAMING_DISCONNECTING, STREAMING_RECONNECT } from '../../logger/constants';
import { IAuthTokenPushEnabled } from './AuthClient/types';
import { TOKEN_REFRESH, AUTH_REJECTION } from '../../utils/constants';
import { ISdkFactoryContextSync } from '../../sdkFactory/types';
import { ISecureSplitHttpClient } from '../../services/types';

/**
 * PushManagerSecure factory: server-side only push manager that delegates
 * JWT authentication to the SecureSplitHttpClient.
 */
export function pushManagerSecureFactory(
  params: ISdkFactoryContextSync,
  pollingManager: IPollingManager,
  secureSplitHttpClient: ISecureSplitHttpClient
): IPushManager | undefined {

  const { settings, storage, readiness, platform, telemetryTracker } = params;
  const log = settings.log;

  let sseClient: ISSEClient;
  try {
    sseClient = new SSEClient(settings, platform);
  } catch (e) {
    log.warn(STREAMING_FALLBACK, [e]);
    return;
  }

  // init feedback loop
  const pushEmitter = new platform.EventEmitter() as IPushEventEmitter;
  const sseHandler = SSEHandlerFactory(log, pushEmitter, telemetryTracker);
  sseClient.setEventHandler(sseHandler);

  // init workers (server-side only)
  const segmentsUpdateWorker = SegmentsUpdateWorker(log, pollingManager.segmentsSyncTask as ISegmentsSyncTask, storage.segments);
  const splitsUpdateWorker = SplitsUpdateWorker(log, storage, pollingManager.splitsSyncTask, readiness.splits, telemetryTracker, pollingManager.segmentsSyncTask as ISegmentsSyncTask);

  // flag that indicates if `stop/disconnectPush` was called
  let disconnected: boolean | undefined;
  // flag that indicates a PUSH_NONRETRYABLE_ERROR
  let disabled: boolean | undefined;

  /** PushManager functions related to initialization */

  const connectPushRetryBackoff = new Backoff(connectPush, settings.scheduler.pushRetryBackoffBase);

  let timeoutIdTokenRefresh: ReturnType<typeof setTimeout>;
  let timeoutIdSseOpen: ReturnType<typeof setTimeout>;

  function scheduleTokenRefreshAndSse(authData: IAuthTokenPushEnabled) {
    // clear scheduled tasks if exist
    if (timeoutIdTokenRefresh) clearTimeout(timeoutIdTokenRefresh);
    if (timeoutIdSseOpen) clearTimeout(timeoutIdSseOpen);

    // Set token refresh 10 minutes before `expirationTime - issuedAt`
    const decodedToken = authData.decodedToken;
    const refreshTokenDelay = decodedToken.exp - decodedToken.iat - SECONDS_BEFORE_EXPIRATION;
    // Default connDelay of 60 secs
    const connDelay = typeof authData.connDelay === 'number' && authData.connDelay >= 0 ? authData.connDelay : 60;

    log.info(STREAMING_REFRESH_TOKEN, [refreshTokenDelay, connDelay]);

    // AuthProvider considers tokens stale SECONDS_BEFORE_EXPIRATION before actual expiry,
    // so getAuthData() will fetch a fresh token when this fires
    timeoutIdTokenRefresh = setTimeout(connectPush, refreshTokenDelay * 1000);

    timeoutIdSseOpen = setTimeout(function () {
      // halt if disconnected
      if (disconnected) return;
      sseClient.open(authData);
    }, connDelay * 1000);

    telemetryTracker.streamingEvent(TOKEN_REFRESH, decodedToken.exp);
  }

  function connectPush() {
    // Guard condition in case `stop/disconnectPush` has been called
    if (disconnected) return;
    log.info(STREAMING_CONNECTING);
    disconnected = false;

    secureSplitHttpClient.getAuthData().then((authData) => {
      if (disconnected) return;

      if (!authData.pushEnabled) {
        log.info(STREAMING_DISABLED);
        pushEmitter.emit(PUSH_NONRETRYABLE_ERROR);
        return;
      }

      scheduleTokenRefreshAndSse(authData);
    }
    ).catch(
      function (error) {
        if (disconnected) return;

        log.error(ERROR_STREAMING_AUTH, [error.message]);

        // Handle 4XX HTTP errors: non-retryable
        if (error.statusCode >= 400 && error.statusCode < 500) {
          telemetryTracker.streamingEvent(AUTH_REJECTION);
          pushEmitter.emit(PUSH_NONRETRYABLE_ERROR);
          return;
        }

        // Handle other HTTP and network errors as recoverable errors
        pushEmitter.emit(PUSH_RETRYABLE_ERROR);
      }
    );
  }

  // close SSE connection and cancel scheduled tasks
  function disconnectPush() {
    if (disconnected) return;
    disconnected = true;

    sseClient.close();
    log.info(STREAMING_DISCONNECTING);

    if (timeoutIdTokenRefresh) clearTimeout(timeoutIdTokenRefresh);
    if (timeoutIdSseOpen) clearTimeout(timeoutIdSseOpen);
    connectPushRetryBackoff.reset();

    stopWorkers();
  }

  function stopWorkers() {
    splitsUpdateWorker.stop();
    segmentsUpdateWorker.stop();
  }

  pushEmitter.on(PUSH_SUBSYSTEM_DOWN, stopWorkers);

  pushEmitter.on(PUSH_SUBSYSTEM_UP, function () {
    connectPushRetryBackoff.reset();
  });

  /** Fallback to polling without retry */
  pushEmitter.on(PUSH_NONRETRYABLE_ERROR, function handleNonRetryableError() {
    disabled = true;
    disconnectPush();
    pushEmitter.emit(PUSH_SUBSYSTEM_DOWN);
  });

  /** Fallback to polling with retry */
  pushEmitter.on(PUSH_RETRYABLE_ERROR, function handleRetryableError() {
    sseClient.close();

    const delayInMillis = connectPushRetryBackoff.scheduleCall();

    log.info(STREAMING_RECONNECT, [delayInMillis / 1000]);

    pushEmitter.emit(PUSH_SUBSYSTEM_DOWN);
  });

  /** STREAMING_RESET notification */
  pushEmitter.on(ControlType.STREAMING_RESET, function handleStreamingReset() {
    if (disconnected) return;

    if (timeoutIdTokenRefresh) clearTimeout(timeoutIdTokenRefresh);

    connectPush();
  });

  /** Wire update workers */
  pushEmitter.on(SPLIT_KILL, splitsUpdateWorker.killSplit);
  pushEmitter.on(SPLIT_UPDATE, splitsUpdateWorker.put);
  pushEmitter.on(RB_SEGMENT_UPDATE, splitsUpdateWorker.put);
  pushEmitter.on(SEGMENT_UPDATE, segmentsUpdateWorker.put);

  return objectAssign(
    Object.create(pushEmitter),
    {
      stop() {
        disconnectPush();
      },

      start() {
        if (disabled || disconnected === false) return;
        disconnected = false;

        setTimeout(connectPush);
      },

      isRunning() {
        return disconnected === false;
      },

      // No-ops for IPushManager interface compatibility (server-side only)
      add() { },
      remove() { }
    }
  );
}
