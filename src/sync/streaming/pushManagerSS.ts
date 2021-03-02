import { IPushEventEmitter, IPushManager } from './types';
import { ISSEClient } from './SSEClient/types';
import { IStorageSync } from '../../storages/types';
import { IPollingManager } from '../polling/types';
import { IReadinessManager } from '../../readiness/types';
import objectAssign from 'object-assign';
import { PUSH_DISABLED, PUSH_DISCONNECT, SECONDS_BEFORE_EXPIRATION, SEGMENT_UPDATE, SPLIT_KILL, SPLIT_UPDATE, SSE_ERROR } from './constants';
import Backoff from '../../utils/Backoff';
import SSEHandlerFactory from './SSEHandler';
import SegmentsUpdateWorker from './UpdateWorkers/SegmentsUpdateWorker';
import SplitsUpdateWorker from './UpdateWorkers/SplitsUpdateWorker';
import { logFactory } from '../../logger/sdkLogger';
import { IFetchAuth } from '../../services/types';
import { authenticateFactory } from './AuthClient';
import SSEClient from './SSEClient';
import { ISettings } from '../../types';
import { IPlatform } from '../../sdkFactory/types';

const log = logFactory('splitio-sync:push-manager');

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

  let sseClient: ISSEClient;
  try {
    sseClient = new SSEClient(settings.urls.streaming, platform.getEventSource);
  } catch (e) {
    log.warn(e + 'Falling back to polling mode.');
    return;
  }
  const authenticate = authenticateFactory(fetchAuth);

  // init feedback loop (pushEmitter)
  const pushEmitter = new platform.EventEmitter() as IPushEventEmitter;
  const sseHandler = SSEHandlerFactory(pushEmitter);
  sseClient.setEventHandler(sseHandler);

  // init workers
  const splitsUpdateWorker = new SplitsUpdateWorker(storage.splits, pollingManager.splitsSyncTask, readiness.splits);
  const segmentsUpdateWorker = new SegmentsUpdateWorker(storage.segments, pollingManager.segmentsSyncTask);

  // flag that indicates if `disconnectPush` was called, either by the SyncManager (when the client is destroyed) or by a STREAMING_DISABLED control notification.
  // It is used to halt the `connectPush` process if it was in progress.
  let disconnected: boolean | undefined;

  /** PushManager functions related to initialization */

  const reauthBackoff = new Backoff(connectPush, settings.scheduler.authRetryBackoffBase);
  const sseReconnectBackoff = new Backoff(sseClient.reopen, settings.scheduler.streamingReconnectBackoffBase);

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

        // restart backoff retry counter for auth and SSE connections, due to HTTP/network errors
        reauthBackoff.reset();
        sseReconnectBackoff.reset(); // reset backoff in case SSE conexion has opened after a HTTP or network error.

        // emit PUSH_DISCONNECT if org is not whitelisted
        if (!authData.pushEnabled) {
          log.info('Streaming is not available. Switching to polling mode.');
          pushEmitter.emit(PUSH_DISCONNECT); // there is no need to close sseClient (it is not open on this scenario)
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

        sseClient.close(); // no harm if already closed
        pushEmitter.emit(PUSH_DISCONNECT); // no harm if `PUSH_DISCONNECT` was already notified

        const errorMessage = `Failed to authenticate for streaming. Error: "${error.message}".`;

        // Handle 4XX HTTP errors: 401 (invalid API Key) or 400 (using incorrect API Key, i.e., client-side API Key on server-side)
        if (error.statusCode >= 400 && error.statusCode < 500) {
          log.error(errorMessage);
          return;
        }

        // Handle other HTTP and network errors
        const delayInMillis = reauthBackoff.scheduleCall();
        log.error(`${errorMessage}. Attempting to reauthenticate in ${delayInMillis / 1000} seconds.`);
      }
    );
  }

  // close SSE connection and cancel scheduled tasks
  function disconnectPush() {
    disconnected = true;
    log.info('Disconnecting from push streaming.');
    sseClient.close();

    if (timeoutId) clearTimeout(timeoutId);
    reauthBackoff.reset();
    sseReconnectBackoff.reset();
  }

  // cancel scheduled fetch retries of Splits, Segments, and MySegments Update Workers
  function stopWorkers() {
    splitsUpdateWorker.backoff.reset();
    segmentsUpdateWorker.backoff.reset();
  }

  pushEmitter.on(PUSH_DISCONNECT, stopWorkers);

  /** Fallbacking due to STREAMING_DISABLED control event */

  pushEmitter.on(PUSH_DISABLED, function () {
    disconnectPush();
    pushEmitter.emit(PUSH_DISCONNECT); // no harm if polling already
  });

  /** Fallbacking due to SSE errors */

  pushEmitter.on(SSE_ERROR, function (error) { // HTTP or network error in SSE connection
    // SSE connection is closed to avoid repeated errors due to retries
    sseClient.close();

    // retries are handled via backoff algorithm
    let delayInMillis;
    if (error.parsedData && (error.parsedData.statusCode === 400 || error.parsedData.statusCode === 401)) {
      delayInMillis = reauthBackoff.scheduleCall(); // reauthenticate in case of token invalid or expired (when somehow refresh token was not properly executed)
    } else {
      delayInMillis = sseReconnectBackoff.scheduleCall(); // reconnect SSE for any other network or HTTP error
    }

    const errorMessage = error.parsedData && error.parsedData.message;
    log.error(`Fail to connect to streaming${errorMessage ? `, with error message: "${errorMessage}"` : ''}. Attempting to reconnect in ${delayInMillis / 1000} seconds.`);

    pushEmitter.emit(PUSH_DISCONNECT); // no harm if polling already
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
      stop() {
        disconnectPush();
        stopWorkers(); // if we call `stopWorkers` inside `disconnectPush`, it would be called twice on a PUSH_DISABLED event, which anyway is not harmful.
      },

      start() {
        // Run in next event-loop cycle as in browser
        setTimeout(connectPush);
      }
    }
  );
}
