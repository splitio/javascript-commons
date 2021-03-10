import { IPushEventEmitter, IPushManager } from './types';
import { ISSEClient } from './SSEClient/types';
import { IStorageSync } from '../../storages/types';
import { IPollingManager } from '../polling/types';
import { IReadinessManager } from '../../readiness/types';
import objectAssign from 'object-assign';
import { PUSH_NONRETRYABLE_ERROR, PUSH_SUBSYSTEM_DOWN, SECONDS_BEFORE_EXPIRATION, SEGMENT_UPDATE, SPLIT_KILL, SPLIT_UPDATE, PUSH_RETRYABLE_ERROR, PUSH_SUBSYSTEM_UP } from './constants';
import Backoff from '../../utils/Backoff';
import SSEHandlerFactory from './SSEHandler';
import SegmentsUpdateWorker from './UpdateWorkers/SegmentsUpdateWorker';
import SplitsUpdateWorker from './UpdateWorkers/SplitsUpdateWorker';
import { IFetchAuth } from '../../services/types';
import { authenticateFactory } from './AuthClient';
import SSEClient from './SSEClient';
import { ISettings } from '../../types';
import { IPlatform } from '../../sdkFactory/types';
// import { logFactory } from '../../logger/sdkLogger';
// const log = logFactory('splitio-sync:push-manager');

/**
 * PushManager factory for server-side
 */
export default function pushManagerSSFactory(
  pollingManager: IPollingManager,
  storage: IStorageSync,
  readiness: IReadinessManager,
  fetchAuth: IFetchAuth,
  platform: IPlatform,
  settings: ISettings
): IPushManager | undefined {

  const log = settings.log;

  let sseClient: ISSEClient;
  try {
    sseClient = new SSEClient(settings.urls.streaming, platform.getEventSource);
  } catch (e) {
    log.warn(`${e}Falling back to polling mode.`);
    return;
  }
  const authenticate = authenticateFactory(fetchAuth);

  // init feedback loop (pushEmitter)
  const pushEmitter = new platform.EventEmitter() as IPushEventEmitter;
  const sseHandler = SSEHandlerFactory(log, pushEmitter);
  sseClient.setEventHandler(sseHandler);

  // init workers
  const splitsUpdateWorker = new SplitsUpdateWorker(storage.splits, pollingManager.splitsSyncTask, readiness.splits);
  const segmentsUpdateWorker = new SegmentsUpdateWorker(storage.segments, pollingManager.segmentsSyncTask);

  // flag that indicates if `disconnectPush` was called, either by the SyncManager (when the client is destroyed) or by a PUSH_NONRETRYABLE_ERROR error.
  // It is used to halt the `connectPush` process if it was in progress.
  let disconnected: boolean | undefined;

  /** PushManager functions related to initialization */

  const connectPushRetryBackoff = new Backoff(connectPush, settings.scheduler.pushRetryBackoffBase);

  let timeoutId: ReturnType<typeof setTimeout>;

  function scheduleTokenRefresh(issuedAt: number, expirationTime: number) {
    // clear scheduled token refresh if exists (needed when resuming PUSH)
    if (timeoutId) clearTimeout(timeoutId);

    // Set token refresh 10 minutes before expirationTime
    const delayInSeconds = expirationTime - issuedAt - SECONDS_BEFORE_EXPIRATION;

    log.info(`Refreshing streaming token in ${delayInSeconds} seconds.`);

    timeoutId = setTimeout(connectPush, delayInSeconds * 1000);
  }

  function connectPush() {
    disconnected = false;
    log.info('Connecting to push streaming.');

    authenticate().then(
      function (authData) {
        if (disconnected) return;

        // 'pushEnabled: false' is handled as a PUSH_NONRETRYABLE_ERROR instead of PUSH_SUBSYSTEM_DOWN, in order to
        // close the sseClient in case the org has been bloqued while the instance was connected to streaming
        if (!authData.pushEnabled) {
          log.info('Streaming is not available. Switching to polling mode.');
          pushEmitter.emit(PUSH_NONRETRYABLE_ERROR);
          return;
        }

        // Connect to SSE and schedule refresh token
        const decodedToken = authData.decodedToken;
        sseClient.open(authData);
        scheduleTokenRefresh(decodedToken.iat, decodedToken.exp);
      }
    ).catch(
      function (error) {
        if (disconnected) return;

        log.error(`Failed to authenticate for streaming. Error: "${error.message}".`);

        // Handle 4XX HTTP errors: 401 (invalid API Key) or 400 (using incorrect API Key, i.e., client-side API Key on server-side)
        if (error.statusCode >= 400 && error.statusCode < 500) {
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
    disconnected = true;
    log.info('Disconnecting from push streaming.');
    sseClient.close();

    if (timeoutId) clearTimeout(timeoutId);
    connectPushRetryBackoff.reset();

    stopWorkers();
  }

  // cancel scheduled fetch retries of Splits, Segments, and MySegments Update Workers
  function stopWorkers() {
    splitsUpdateWorker.backoff.reset();
    segmentsUpdateWorker.backoff.reset();
  }

  pushEmitter.on(PUSH_SUBSYSTEM_DOWN, stopWorkers);

  // restart backoff retry counter once push is connected
  pushEmitter.on(PUSH_SUBSYSTEM_UP, () => { connectPushRetryBackoff.reset(); });

  /** Fallbacking without retry due to: STREAMING_DISABLED control event, or 'pushEnabled: false', or non-recoverable SSE and Authentication errors */

  pushEmitter.on(PUSH_NONRETRYABLE_ERROR, function handleNonRetryableError() {
    // Note: `stopWorkers` is been called twice, but it is not harmful
    disconnectPush();
    pushEmitter.emit(PUSH_SUBSYSTEM_DOWN); // no harm if polling already
  });

  /** Fallbacking with retry due to recoverable SSE and Authentication errors */

  pushEmitter.on(PUSH_RETRYABLE_ERROR, function handleRetryableError() { // HTTP or network error in SSE connection
    // SSE connection is closed to avoid repeated errors due to retries
    sseClient.close();

    // retry streaming reconnect with backoff algorithm
    let delayInMillis = connectPushRetryBackoff.scheduleCall();

    log.info(`Attempting to reconnect in ${delayInMillis / 1000} seconds.`);

    pushEmitter.emit(PUSH_SUBSYSTEM_DOWN); // no harm if polling already
  });

  /** Functions related to synchronization (Queues and Workers in the spec) */

  pushEmitter.on(SPLIT_KILL, splitsUpdateWorker.killSplit);
  pushEmitter.on(SPLIT_UPDATE, splitsUpdateWorker.put);
  // [Only for server-side]
  pushEmitter.on(SEGMENT_UPDATE, segmentsUpdateWorker.put);

  return objectAssign(
    // Expose Event Emitter functionality and Event constants
    Object.create(pushEmitter),
    {
      // Expose functionality for starting and stoping push mode:
      stop: disconnectPush, // `handleNonRetryableError` cannot be used as `stop`, because it emits PUSH_SUBSYSTEM_DOWN event, which start polling.

      start() {
        // Run in next event-loop cycle as in browser
        setTimeout(connectPush);
      }
    }
  );
}
