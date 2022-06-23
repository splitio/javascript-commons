import { errorParser, messageParser } from './NotificationParser';
import { notificationKeeperFactory } from './NotificationKeeper';
import { PUSH_RETRYABLE_ERROR, PUSH_NONRETRYABLE_ERROR, OCCUPANCY, CONTROL, MY_SEGMENTS_UPDATE, MY_SEGMENTS_UPDATE_V2, SEGMENT_UPDATE, SPLIT_KILL, SPLIT_UPDATE } from '../constants';
import { IPushEventEmitter } from '../types';
import { ISseEventHandler } from '../SSEClient/types';
import { INotificationError, INotificationMessage } from './types';
import { ILogger } from '../../../logger/types';
import { STREAMING_PARSING_ERROR_FAILS, ERROR_STREAMING_SSE, STREAMING_PARSING_MESSAGE_FAILS, STREAMING_NEW_MESSAGE } from '../../../logger/constants';
import { ABLY_ERROR, NON_REQUESTED, SSE_CONNECTION_ERROR } from '../../../utils/constants';
import { ITelemetryTracker } from '../../../trackers/types';

/**
 * Factory for SSEHandler, which processes SSEClient messages and emits the corresponding push events.
 *
 * @param log factory logger
 * @param pushEmitter emitter for events related to streaming support
 */
export function SSEHandlerFactory(log: ILogger, pushEmitter: IPushEventEmitter, telemetryTracker: ITelemetryTracker): ISseEventHandler {

  const notificationKeeper = notificationKeeperFactory(pushEmitter, telemetryTracker);

  function isRetryableError(error: INotificationError): boolean {
    if (error.parsedData && error.parsedData.code) {
      // Ably error
      const code = error.parsedData.code;
      telemetryTracker.streamingEvent(ABLY_ERROR, code);

      // 401 errors due to invalid or expired token (e.g., if refresh token coudn't be executed)
      if (40140 <= code && code <= 40149) return true;
      // Others 4XX errors (e.g., bad request from the SDK)
      if (40000 <= code && code <= 49999) return false;
    } else {
      // network errors or 5XX HTTP errors
      telemetryTracker.streamingEvent(SSE_CONNECTION_ERROR, NON_REQUESTED);
    }
    return true;
  }

  return {
    handleOpen() {
      notificationKeeper.handleOpen();
    },

    /* HTTP & Network errors */
    handleError(error) {
      let errorWithParsedData: INotificationError = error;
      try {
        errorWithParsedData = errorParser(error);
      } catch (err) {
        log.warn(STREAMING_PARSING_ERROR_FAILS, [err]);
      }

      let errorMessage = (errorWithParsedData.parsedData && errorWithParsedData.parsedData.message) || errorWithParsedData.message;
      log.error(ERROR_STREAMING_SSE, [errorMessage]);

      if (isRetryableError(errorWithParsedData)) {
        pushEmitter.emit(PUSH_RETRYABLE_ERROR);
      } else {
        pushEmitter.emit(PUSH_NONRETRYABLE_ERROR);
      }
    },

    /* NotificationProcessor */
    handleMessage(message) {
      let messageWithParsedData: INotificationMessage | undefined;
      try {
        messageWithParsedData = messageParser(message);
        if (!messageWithParsedData) return; // Messages with empty data are ignored
      } catch (err) {
        log.warn(STREAMING_PARSING_MESSAGE_FAILS, [err]);
        return;
      }

      const { parsedData, data, channel, timestamp } = messageWithParsedData;
      log.debug(STREAMING_NEW_MESSAGE, [data]);

      // we only handle update events if streaming is up.
      if (!notificationKeeper.isStreamingUp() && [OCCUPANCY, CONTROL].indexOf(parsedData.type) === -1)
        return;

      switch (parsedData.type) {
        /* update events */
        case SPLIT_UPDATE:
        case SEGMENT_UPDATE:
        case MY_SEGMENTS_UPDATE_V2:
        case SPLIT_KILL:
          pushEmitter.emit(parsedData.type, parsedData);
          break;
        case MY_SEGMENTS_UPDATE:
          pushEmitter.emit(parsedData.type, parsedData, channel);
          break;

        /* occupancy & control events, handled by NotificationManagerKeeper */
        case OCCUPANCY:
          notificationKeeper.handleOccupancyEvent(parsedData.metrics.publishers, channel, timestamp);
          break;
        case CONTROL:
          notificationKeeper.handleControlEvent(parsedData.controlType, channel, timestamp);
          break;

        default:
          break;
      }
    },

  };
}
