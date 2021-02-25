import { IPushEventEmitter, IPushManagerCS } from './types';
import { ISSEClient } from './SSEClient/types';
import { IStorageSync } from '../../storages/types';
import { IReadinessManager } from '../../readiness/types';
import { ISegmentsSyncTask, IPollingManager } from '../polling/types';
import { IUpdateWorker } from './UpdateWorkers/types';
import objectAssign from 'object-assign';
import { MY_SEGMENTS_UPDATE, PUSH_DISABLED, PUSH_DISCONNECT, SECONDS_BEFORE_EXPIRATION, SPLIT_KILL, SPLIT_UPDATE, SSE_ERROR } from './constants';
import Backoff from '../../utils/Backoff';
import SSEHandlerFactory from './SSEHandler';
import MySegmentsUpdateWorker from './UpdateWorkers/MySegmentsUpdateWorker';
import SplitsUpdateWorker from './UpdateWorkers/SplitsUpdateWorker';
import { authenticateFactory, hashUserKey } from './AuthClient';
import { forOwn } from '../../utils/lang';
import { logFactory } from '../../logger/sdkLogger';
import SSEClient from './SSEClient';
import { IFetchAuth } from '../../services/types';
import { ISettings } from '../../types';
import { getMatching } from '../../utils/key';
import { IPlatform } from '../../sdkFactory/types';

const log = logFactory('splitio-sync:push-manager');

/**
 * PushManager factory for client-side, with support for multiple clients.
 * It assumes settings contains a key.
 */
export default function pushManagerCSFactory(
  pollingManager: IPollingManager,
  storage: IStorageSync,
  readiness: IReadinessManager,
  fetchAuth: IFetchAuth,
  platform: IPlatform,
  settings: ISettings
): IPushManagerCS | undefined {

  let sseClient: ISSEClient;
  try {
    sseClient = new SSEClient(settings.urls.streaming, platform.getEventSource);
  } catch (e) {
    log.w(e + 'Falling back to polling mode.');
    return;
  }
  const authenticate = authenticateFactory(fetchAuth);

  // init feedback loop
  const pushEmitter = new platform.EventEmitter() as IPushEventEmitter;
  const sseHandler = SSEHandlerFactory(pushEmitter);
  sseClient.setEventHandler(sseHandler);

  // [Only for client-side] map of hashes to user keys, to dispatch MY_SEGMENTS_UPDATE events to the corresponding MySegmentsUpdateWorker
  const userKeyHashes: Record<string, string> = {};
  const userKey = getMatching(settings.core.key); // matching key of main client
  const hash = hashUserKey(userKey);
  userKeyHashes[hash] = userKey;

  // [Only for client-side] map of user keys to their corresponding MySegmentsUpdateWorkers. It has a two-fold intention:
  // - stop workers all together when push is disconnected
  // - keep the current list of user keys to authenticate
  const workers: Record<string, IUpdateWorker> = {};

  // init workers
  const mySegmentsUpdateWorker = new MySegmentsUpdateWorker(pollingManager.segmentsSyncTask);
  workers[userKey] = mySegmentsUpdateWorker;
  const splitsUpdateWorker = new SplitsUpdateWorker(storage.splits, pollingManager.splitsSyncTask, readiness.splits);

  // [Only for client-side] variable to flag that a new client was added. It is needed to reconnect streaming.
  let connectForNewClient = false;

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

    log.i(`Refreshing streaming token in ${delayInSeconds} seconds.`);

    timeoutId = setTimeout(connectPush, delayInSeconds * 1000);
  }

  function connectPush() {
    disconnected = false;
    log.i('Connecting to push streaming.');

    const userKeys = Object.keys(workers); // [Only for client-side]
    authenticate(userKeys).then(
      function (authData) {
        if (disconnected) return;

        // restart backoff retry counter for auth and SSE connections, due to HTTP/network errors
        reauthBackoff.reset();
        sseReconnectBackoff.reset(); // reset backoff in case SSE conexion has opened after a HTTP or network error.

        // emit PUSH_DISCONNECT if org is not whitelisted
        if (!authData.pushEnabled) {
          log.i('Streaming is not available. Switching to polling mode.');
          pushEmitter.emit(PUSH_DISCONNECT); // there is no need to close sseClient (it is not open on this scenario)
          return;
        }

        // [Only for client-side] don't open SSE connection if a new shared client was added, since it means that a new authentication is taking place
        if (userKeys && userKeys.length < Object.keys(workers).length) return;

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
          log.e(errorMessage);
          return;
        }

        // Handle other HTTP and network errors
        const delayInMillis = reauthBackoff.scheduleCall();
        log.e(`${errorMessage}. Attempting to reauthenticate in ${delayInMillis / 1000} seconds.`);
      }
    );
  }

  // close SSE connection and cancel scheduled tasks
  function disconnectPush() {
    disconnected = true;
    log.i('Disconnecting from push streaming.');
    sseClient.close();

    if (timeoutId) clearTimeout(timeoutId);
    reauthBackoff.reset();
    sseReconnectBackoff.reset();
  }

  // cancel scheduled fetch retries of Splits, Segments, and MySegments Update Workers
  function stopWorkers() {
    splitsUpdateWorker.backoff.reset();
    forOwn(workers, worker => worker.backoff.reset());
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
    log.e(`Fail to connect to streaming${errorMessage ? ', with error message: "' + errorMessage + '"' : ''}. Attempting to reconnect in ${delayInMillis / 1000} seconds.`);

    pushEmitter.emit(PUSH_DISCONNECT); // no harm if polling already
  });

  /** Functions related to synchronization (Queues and Workers in the spec) */

  pushEmitter.on(SPLIT_KILL, splitsUpdateWorker.killSplit);
  pushEmitter.on(SPLIT_UPDATE, splitsUpdateWorker.put);
  // [Only for client-side]
  pushEmitter.on(MY_SEGMENTS_UPDATE, function handleMySegmentsUpdate(parsedData, channel) {
    const userKeyHash = channel.split('_')[2];
    const userKey = userKeyHashes[userKeyHash];
    if (userKey && workers[userKey]) { // check context since it can be undefined if client has been destroyed
      const mySegmentsUpdateWorker = workers[userKey];
      mySegmentsUpdateWorker.put(
        parsedData.changeNumber,
        parsedData.includesPayload ? parsedData.segmentList ? parsedData.segmentList : [] : undefined);
    }
  });

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
        // Run in next event-loop cycle for optimization: if multiple clients are created in the same cycle than the factory, only one authentication is performed.
        setTimeout(connectPush);
      },

      // [Only for client-side]
      add(userKey: string, mySegmentsSyncTask: ISegmentsSyncTask) {
        const mySegmentsUpdateWorker = new MySegmentsUpdateWorker(mySegmentsSyncTask);
        workers[userKey] = mySegmentsUpdateWorker;

        const hash = hashUserKey(userKey);

        if (!userKeyHashes[hash]) {
          userKeyHashes[hash] = userKey;
          connectForNewClient = true; // we must reconnect on start, to listen the channel for the new user key
        }

        // Reconnects in case of a new client.
        // Run in next event-loop cycle to save authentication calls
        // in case the user is creating several clients in the current cycle.
        setTimeout(function checkForReconnect() {
          if (connectForNewClient) {
            connectForNewClient = false;
            connectPush();
          }
        }, 0);
      },
      // [Only for client-side]
      remove(userKey: string) {
        const hash = hashUserKey(userKey);
        delete userKeyHashes[hash];
      }
    }
  );
}
