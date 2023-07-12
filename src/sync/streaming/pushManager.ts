import { IPushEventEmitter, IPushManager } from './types';
import { ISSEClient } from './SSEClient/types';
import { IMySegmentsSyncTask, IPollingManager, ISegmentsSyncTask } from '../polling/types';
import { objectAssign } from '../../utils/lang/objectAssign';
import { Backoff } from '../../utils/Backoff';
import { SSEHandlerFactory } from './SSEHandler';
import { MySegmentsUpdateWorker } from './UpdateWorkers/MySegmentsUpdateWorker';
import { SegmentsUpdateWorker } from './UpdateWorkers/SegmentsUpdateWorker';
import { SplitsUpdateWorker } from './UpdateWorkers/SplitsUpdateWorker';
import { authenticateFactory, hashUserKey } from './AuthClient';
import { forOwn } from '../../utils/lang';
import { SSEClient } from './SSEClient';
import { getMatching } from '../../utils/key';
import { MY_SEGMENTS_UPDATE, MY_SEGMENTS_UPDATE_V2, PUSH_NONRETRYABLE_ERROR, PUSH_SUBSYSTEM_DOWN, SECONDS_BEFORE_EXPIRATION, SEGMENT_UPDATE, SPLIT_KILL, SPLIT_UPDATE, PUSH_RETRYABLE_ERROR, PUSH_SUBSYSTEM_UP, ControlType } from './constants';
import { STREAMING_FALLBACK, STREAMING_REFRESH_TOKEN, STREAMING_CONNECTING, STREAMING_DISABLED, ERROR_STREAMING_AUTH, STREAMING_DISCONNECTING, STREAMING_RECONNECT, STREAMING_PARSING_MY_SEGMENTS_UPDATE_V2, STREAMING_PARSING_SPLIT_UPDATE } from '../../logger/constants';
import { KeyList, UpdateStrategy } from './SSEHandler/types';
import { isInBitmap, parseBitmap, parseFFUpdatePayload, parseKeyList } from './parseUtils';
import { ISet, _Set } from '../../utils/lang/sets';
import { Hash64, hash64 } from '../../utils/murmur3/murmur3_64';
import { IAuthTokenPushEnabled } from './AuthClient/types';
import { TOKEN_REFRESH, AUTH_REJECTION } from '../../utils/constants';
import { ISdkFactoryContextSync } from '../../sdkFactory/types';
import { IUpdateWorker } from './UpdateWorkers/types';

/**
 * PushManager factory:
 * - for server-side if key is not provided in settings.
 * - for client-side, with support for multiple clients, if key is provided in settings
 */
export function pushManagerFactory(
  params: ISdkFactoryContextSync,
  pollingManager: IPollingManager,
): IPushManager | undefined {

  const { settings, storage, splitApi, readiness, platform, telemetryTracker } = params;

  // `userKey` is the matching key of main client in client-side SDK.
  // It can be used to check if running on client-side or server-side SDK.
  const userKey = settings.core.key ? getMatching(settings.core.key) : undefined;
  const log = settings.log;

  let sseClient: ISSEClient;
  try {
    // `useHeaders` false for client-side, even if the platform EventSource supports headers (e.g., React Native).
    sseClient = new SSEClient(settings, userKey ? false : true, platform.getEventSource);
  } catch (e) {
    log.warn(STREAMING_FALLBACK, [e]);
    return;
  }
  const authenticate = authenticateFactory(splitApi.fetchAuth);

  // init feedback loop
  const pushEmitter = new platform.EventEmitter() as IPushEventEmitter;
  const sseHandler = SSEHandlerFactory(log, pushEmitter, telemetryTracker);
  sseClient.setEventHandler(sseHandler);

  // init workers
  // MySegmentsUpdateWorker (client-side) are initiated in `add` method
  const segmentsUpdateWorker = userKey ? undefined : SegmentsUpdateWorker(log, pollingManager.segmentsSyncTask as ISegmentsSyncTask, storage.segments);
  // For server-side we pass the segmentsSyncTask, used by SplitsUpdateWorker to fetch new segments
  const splitsUpdateWorker = SplitsUpdateWorker(log, storage.splits, pollingManager.splitsSyncTask, readiness.splits, telemetryTracker, userKey ? undefined : pollingManager.segmentsSyncTask as ISegmentsSyncTask);

  // [Only for client-side] map of hashes to user keys, to dispatch MY_SEGMENTS_UPDATE events to the corresponding MySegmentsUpdateWorker
  const userKeyHashes: Record<string, string> = {};
  // [Only for client-side] map of user keys to their corresponding hash64 and MySegmentsUpdateWorkers.
  // Hash64 is used to process MY_SEGMENTS_UPDATE_V2 events and dispatch actions to the corresponding MySegmentsUpdateWorker.
  const clients: Record<string, { hash64: Hash64, worker: IUpdateWorker }> = {};

  // [Only for client-side] variable to flag that a new client was added. It is needed to reconnect streaming.
  let connectForNewClient = false;

  // flag that indicates if `stop/disconnectPush` was called, either by the SyncManager, when the client is destroyed, or due to a PUSH_NONRETRYABLE_ERROR error.
  // It is used to halt the `connectPush` process if it was in progress.
  let disconnected: boolean | undefined;
  // flag that indicates a PUSH_NONRETRYABLE_ERROR, condition with which starting pushManager again is ignored.
  // true if STREAMING_DISABLED control event, or 'pushEnabled: false', or non-recoverable SSE or Auth errors.
  let disabled: boolean | undefined; // `disabled` implies `disconnected === true`

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

    timeoutIdTokenRefresh = setTimeout(connectPush, refreshTokenDelay * 1000);

    timeoutIdSseOpen = setTimeout(() => {
      // halt if disconnected
      if (disconnected) return;
      sseClient.open(authData);
    }, connDelay * 1000);

    telemetryTracker.streamingEvent(TOKEN_REFRESH, decodedToken.exp);
  }

  function connectPush() {
    // Guard condition in case `stop/disconnectPush` has been called (e.g., calling SDK destroy, or app signal close/background)
    if (disconnected) return;
    // @TODO distinguish log for 'Connecting' (1st time) and 'Re-connecting'
    log.info(STREAMING_CONNECTING);
    disconnected = false;

    const userKeys = userKey ? Object.keys(clients) : undefined;
    authenticate(userKeys).then(
      function (authData) {
        if (disconnected) return;

        // 'pushEnabled: false' is handled as a PUSH_NONRETRYABLE_ERROR instead of PUSH_SUBSYSTEM_DOWN, in order to
        // close the sseClient in case the org has been bloqued while the instance was connected to streaming
        if (!authData.pushEnabled) {
          log.info(STREAMING_DISABLED);
          pushEmitter.emit(PUSH_NONRETRYABLE_ERROR);
          return;
        }

        // [Only for client-side] don't open SSE connection if a new shared client was added, since it means that a new authentication is taking place
        if (userKeys && userKeys.length < Object.keys(clients).length) return;

        // Schedule SSE connection and refresh token
        scheduleTokenRefreshAndSse(authData);
      }
    ).catch(
      function (error) {
        if (disconnected) return;

        log.error(ERROR_STREAMING_AUTH, [error.message]);

        // Handle 4XX HTTP errors: 401 (invalid SDK Key) or 400 (using incorrect SDK Key, i.e., client-side SDK Key on server-side)
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
    // Halt disconnecting, just to avoid redundant logs if called multiple times
    if (disconnected) return;
    disconnected = true;

    sseClient.close();
    log.info(STREAMING_DISCONNECTING);

    if (timeoutIdTokenRefresh) clearTimeout(timeoutIdTokenRefresh);
    if (timeoutIdSseOpen) clearTimeout(timeoutIdSseOpen);
    connectPushRetryBackoff.reset();

    stopWorkers();
  }

  // cancel scheduled fetch retries of Splits, Segments, and MySegments Update Workers
  function stopWorkers() {
    splitsUpdateWorker.stop();
    if (userKey) forOwn(clients, ({ worker }) => worker.stop());
    else segmentsUpdateWorker!.stop();
  }

  pushEmitter.on(PUSH_SUBSYSTEM_DOWN, stopWorkers);

  // Only required when streaming connects after a PUSH_RETRYABLE_ERROR.
  // Otherwise it is unnecessary (e.g, STREAMING_RESUMED).
  pushEmitter.on(PUSH_SUBSYSTEM_UP, () => {
    connectPushRetryBackoff.reset();
  });

  /** Fallback to polling without retry due to: STREAMING_DISABLED control event, or 'pushEnabled: false', or non-recoverable SSE and Authentication errors */

  pushEmitter.on(PUSH_NONRETRYABLE_ERROR, function handleNonRetryableError() {
    disabled = true;
    // Note: `stopWorkers` is been called twice, but it is not harmful
    disconnectPush();
    pushEmitter.emit(PUSH_SUBSYSTEM_DOWN); // no harm if polling already
  });

  /** Fallback to polling with retry due to recoverable SSE and Authentication errors */

  pushEmitter.on(PUSH_RETRYABLE_ERROR, function handleRetryableError() { // HTTP or network error in SSE connection
    // SSE connection is closed to avoid repeated errors due to retries
    sseClient.close();

    // retry streaming reconnect with backoff algorithm
    let delayInMillis = connectPushRetryBackoff.scheduleCall();

    log.info(STREAMING_RECONNECT, [delayInMillis / 1000]);

    pushEmitter.emit(PUSH_SUBSYSTEM_DOWN); // no harm if polling already
  });

  /** STREAMING_RESET notification. Unlike a PUSH_RETRYABLE_ERROR, it doesn't emit PUSH_SUBSYSTEM_DOWN to fallback polling */

  pushEmitter.on(ControlType.STREAMING_RESET, function handleStreamingReset() {
    if (disconnected) return; // should never happen

    // Minimum required clean-up.
    // `disconnectPush` cannot be called because it sets `disconnected` and thus `connectPush` will not execute
    if (timeoutIdTokenRefresh) clearTimeout(timeoutIdTokenRefresh);

    connectPush();
  });

  /** Functions related to synchronization (Queues and Workers in the spec) */

  pushEmitter.on(SPLIT_KILL, splitsUpdateWorker.killSplit);
  pushEmitter.on(SPLIT_UPDATE, (parsedData) => {
    if (parsedData.d && parsedData.c !== undefined) {
      try {
        const payload = parseFFUpdatePayload(parsedData.c, parsedData.d);
        if (payload) {
          splitsUpdateWorker.put(parsedData, payload);
          return;
        }
      } catch (e) {
        log.warn(STREAMING_PARSING_SPLIT_UPDATE, [e]);
      }
    }
    splitsUpdateWorker.put(parsedData);
  });

  if (userKey) {
    pushEmitter.on(MY_SEGMENTS_UPDATE, function handleMySegmentsUpdate(parsedData, channel) {
      const userKeyHash = channel.split('_')[2];
      const userKey = userKeyHashes[userKeyHash];
      if (userKey && clients[userKey]) { // check existence since it can be undefined if client has been destroyed
        clients[userKey].worker.put(
          parsedData.changeNumber,
          parsedData.includesPayload ? parsedData.segmentList ? parsedData.segmentList : [] : undefined);
      }
    });
    pushEmitter.on(MY_SEGMENTS_UPDATE_V2, function handleMySegmentsUpdate(parsedData) {
      switch (parsedData.u) {
        case UpdateStrategy.BoundedFetchRequest: {
          let bitmap: Uint8Array;
          try {
            bitmap = parseBitmap(parsedData.d, parsedData.c);
          } catch (e) {
            log.warn(STREAMING_PARSING_MY_SEGMENTS_UPDATE_V2, ['BoundedFetchRequest', e]);
            break;
          }

          forOwn(clients, ({ hash64, worker }) => {
            if (isInBitmap(bitmap, hash64.hex)) {
              worker.put(parsedData.changeNumber); // fetch mySegments
            }
          });
          return;
        }
        case UpdateStrategy.KeyList: {
          let keyList: KeyList, added: ISet<string>, removed: ISet<string>;
          try {
            keyList = parseKeyList(parsedData.d, parsedData.c);
            added = new _Set(keyList.a);
            removed = new _Set(keyList.r);
          } catch (e) {
            log.warn(STREAMING_PARSING_MY_SEGMENTS_UPDATE_V2, ['KeyList', e]);
            break;
          }

          forOwn(clients, ({ hash64, worker }) => {
            const add = added.has(hash64.dec) ? true : removed.has(hash64.dec) ? false : undefined;
            if (add !== undefined) {
              worker.put(parsedData.changeNumber, {
                name: parsedData.segmentName,
                add
              });
            }
          });
          return;
        }
        case UpdateStrategy.SegmentRemoval:
          if (!parsedData.segmentName) {
            log.warn(STREAMING_PARSING_MY_SEGMENTS_UPDATE_V2, ['SegmentRemoval', 'No segment name was provided']);
            break;
          }

          forOwn(clients, ({ worker }) =>
            worker.put(parsedData.changeNumber, {
              name: parsedData.segmentName,
              add: false
            })
          );
          return;
      }

      // `UpdateStrategy.UnboundedFetchRequest` and fallbacks of other cases
      forOwn(clients, ({ worker }) => {
        worker.put(parsedData.changeNumber);
      });
    });
  } else {
    pushEmitter.on(SEGMENT_UPDATE, segmentsUpdateWorker!.put);
  }

  return objectAssign(
    // Expose Event Emitter functionality and Event constants
    Object.create(pushEmitter),
    {
      // Stop/pause push mode.
      // It doesn't emit events. Neither PUSH_SUBSYSTEM_DOWN to start polling.
      stop() {
        disconnectPush(); // `handleNonRetryableError` cannot be used as `stop`, because it emits PUSH_SUBSYSTEM_DOWN event, which starts polling.
        if (userKey) this.remove(userKey); // Necessary to properly resume streaming in client-side (e.g., RN SDK transition to foreground).
      },

      // Start/resume push mode.
      // It eventually emits PUSH_SUBSYSTEM_DOWN, that starts polling, or PUSH_SUBSYSTEM_UP, that executes a syncAll
      start() {
        // Guard condition to avoid calling `connectPush` again if the `start` method is called multiple times or if push has been disabled.
        if (disabled || disconnected === false) return;
        disconnected = false;

        if (userKey) this.add(userKey, pollingManager.segmentsSyncTask as IMySegmentsSyncTask); // client-side
        else setTimeout(connectPush); // server-side runs in next cycle as in client-side, for consistency with client-side
      },

      // true/false if start or stop was called last respectively
      isRunning() {
        return disconnected === false;
      },

      // [Only for client-side]
      add(userKey: string, mySegmentsSyncTask: IMySegmentsSyncTask) {
        const hash = hashUserKey(userKey);

        if (!userKeyHashes[hash]) {
          userKeyHashes[hash] = userKey;
          clients[userKey] = { hash64: hash64(userKey), worker: MySegmentsUpdateWorker(mySegmentsSyncTask, telemetryTracker) };
          connectForNewClient = true; // we must reconnect on start, to listen the channel for the new user key

          // Reconnects in case of a new client.
          // Run in next event-loop cycle to save authentication calls
          // in case multiple clients are created in the current cycle.
          setTimeout(function checkForReconnect() {
            if (connectForNewClient) {
              connectForNewClient = false;
              connectPush();
            }
          }, 0);
        }
      },
      // [Only for client-side]
      remove(userKey: string) {
        const hash = hashUserKey(userKey);
        delete userKeyHashes[hash];
        delete clients[userKey];
      }
    }
  );
}
